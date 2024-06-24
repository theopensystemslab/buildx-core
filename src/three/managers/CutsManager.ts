import { Brush, Evaluator, ADDITION } from "three-bvh-csg";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { BoxGeometry, DoubleSide, MeshBasicMaterial } from "three";
import {
  ClippedElementBrush,
  FullElementBrush,
} from "../objects/house/ElementGroup";
import { isModuleGroup } from "../objects/house/ModuleGroup";
import { pipe } from "fp-ts/lib/function";
import { A, O, compareProps, someOrError } from "@/utils/functions";
import { HouseGroup } from "../objects/house/HouseGroup";

const PAD = 5;

const clippingMaterial = new MeshBasicMaterial({
  color: "white",
  side: DoubleSide,
});

class CutsManager {
  private houseGroup: HouseGroup;
  private evaluator: Evaluator;
  private clippingBrushes: {
    x?: Brush;
    y?: Brush;
    z?: Brush;
  };
  settings: {
    x: boolean;
    z: boolean;
    rowIndex: number | null;
  };

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.evaluator = new Evaluator();
    this.clippingBrushes = {};
    this.settings = {
      rowIndex: null,
      x: false,
      z: false,
    };
  }

  get activeLayoutGroup(): ColumnLayoutGroup {
    return this.houseGroup.activeLayoutGroup;
  }

  private createClippingBrushX() {
    const {
      obb: { halfSize },
    } = this.activeLayoutGroup;

    const width = halfSize.x + PAD;
    const height = halfSize.y * 2 + PAD;
    const depth = halfSize.z * 2 + PAD;

    const x = width / 2;
    const y = halfSize.y;
    const z = halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      clippingMaterial
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    this.clippingBrushes.x = clippingBrush;

    return this.clippingBrushes.x;
  }

  private createClippingBrushZ() {
    const {
      obb: { halfSize },
    } = this.activeLayoutGroup;

    const width = halfSize.x * 2 + PAD;
    const height = halfSize.y * 2 + PAD;
    const depth = halfSize.z + PAD;

    const x = 0;
    const y = halfSize.y;
    const z = depth / 2 + halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      clippingMaterial
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    this.clippingBrushes.z = clippingBrush;

    return this.clippingBrushes.z;
  }

  private createClippingBrushY(rowIndex: number) {
    const {
      userData: { layout },
      obb: { halfSize },
    } = this.activeLayoutGroup;

    const clippingBrush = pipe(
      layout,
      A.head,
      O.chain(({ positionedRows }) => pipe(positionedRows, A.lookup(rowIndex))),
      O.chain(({ y, positionedModules, levelType }) =>
        pipe(
          positionedModules,
          A.head,
          O.map(({ module: { height } }) => {
            const levelLetter = levelType[0];
            const sign = levelLetter === "F" ? -1 : 1;
            const result = sign * (height / 2) + y;
            return result;
          })
        )
      ),
      O.map((levelHeight) => {
        const width = halfSize.x * 2 + PAD;

        const height = halfSize.y * 2 + PAD;
        const depth = 999;

        const x = 0;
        const y = height / 2 + levelHeight;
        const z = halfSize.z;

        const clippingBrush = new Brush(
          new BoxGeometry(width, height, depth),
          clippingMaterial
        );
        clippingBrush.position.set(x, y, z);
        clippingBrush.updateMatrixWorld();

        return clippingBrush;
      }),
      someOrError(`failure`)
    );

    this.clippingBrushes.y = clippingBrush;

    return clippingBrush;
  }

  private destroyClippedBrushes() {
    this.activeLayoutGroup.traverse((node) => {
      if (node instanceof ClippedElementBrush) {
        node.removeFromParent();
      }
    });
  }

  private get layoutGroupsActiveFirst(): ColumnLayoutGroup[] {
    const otherLayoutGroups = this.houseGroup.children.filter(
      (x): x is ColumnLayoutGroup =>
        x instanceof ColumnLayoutGroup && x !== this.activeLayoutGroup
    );

    return [this.activeLayoutGroup, ...otherLayoutGroups];
  }

  private createClippedBrushes(clippingBrush: Brush) {
    this.layoutGroupsActiveFirst.forEach((layoutGroup) => {
      layoutGroup.traverse((node) => {
        if (isModuleGroup(node)) {
          node.createClippedBrushes(clippingBrush);
        }
      });
    });
  }

  private showClippedBrushes() {
    this.layoutGroupsActiveFirst.forEach((x) =>
      x.traverse((node) => {
        if (node instanceof FullElementBrush) {
          node.visible = false;
        } else if (node instanceof ClippedElementBrush) {
          node.visible = true;
        }
      })
    );
  }

  private showElementBrushes() {
    this.layoutGroupsActiveFirst.forEach((x) =>
      x.traverse((node) => {
        if (node instanceof FullElementBrush) {
          node.visible = true;
        } else if (node instanceof ClippedElementBrush) {
          node.visible = false;
        }
      })
    );
  }

  setClippingBrush(settings: typeof this.settings) {
    this.destroyClippedBrushes();

    this.settings = settings;

    const { x, z, rowIndex } = settings;

    let brush: Brush | null = null;

    if (x) {
      brush = this.createClippingBrushX();
    }
    if (z) {
      const brushZ = this.createClippingBrushZ();
      brush =
        brush === null
          ? brushZ
          : this.evaluator.evaluate(brush, brushZ, ADDITION);
    }
    if (rowIndex !== null) {
      const brushY = this.createClippingBrushY(rowIndex);
      brush =
        brush === null
          ? brushY
          : this.evaluator.evaluate(brush, brushY, ADDITION);
    }

    if (brush !== null) {
      brush.applyMatrix4(this.houseGroup.matrixWorld);
      brush.updateMatrixWorld();
      this.createClippedBrushes(brush);
      this.showClippedBrushes();
    } else {
      this.showElementBrushes();
    }
  }

  recomputeClipping() {
    this.setClippingBrush(this.settings);
  }

  cycleClippingBrush() {
    const settings: Array<typeof this.settings> = [
      {
        x: false,
        z: false,
        rowIndex: null,
      },
      {
        x: true,
        z: false,
        rowIndex: null,
      },
      {
        x: false,
        z: true,
        rowIndex: null,
      },
      {
        x: false,
        z: false,
        rowIndex: 1,
      },
      {
        x: true,
        z: true,
        rowIndex: null,
      },
      {
        x: true,
        z: true,
        rowIndex: 1,
      },
    ];
    const currentIndex = settings.findIndex((x) =>
      compareProps(x, this.settings)
    );
    const nextIndex = (currentIndex + 1) % settings.length;
    const nextSetting = settings[nextIndex];
    this.setClippingBrush(nextSetting);
  }
}

export default CutsManager;
