import { A, O, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { BoxGeometry, DoubleSide, MeshBasicMaterial, Scene } from "three";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import {
  ClippedElementBrush,
  FullElementBrush,
} from "../objects/house/ElementGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { isModuleGroup } from "../objects/house/ModuleGroup";

const C = 3;

const clippingMaterial = new MeshBasicMaterial({
  color: "white",
  side: DoubleSide,
});

class CutsManager {
  houseGroup: HouseGroup;
  clippingBrushes: {
    x: Brush;
    y?: Brush;
    z: Brush;
    composite?: Brush;
  };
  evaluator: Evaluator;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.clippingBrushes = {
      x: this.createClippingBrushX(),
      z: this.createClippingBrushZ(),
    };
    this.evaluator = new Evaluator();
  }

  set clipWidth(b: boolean) {
    if (b) {
      if (this.clippingBrushes.composite) {
        this.clippingBrushes.composite = this.evaluator.evaluate(
          this.clippingBrushes.composite,
          this.clippingBrushes.x,
          ADDITION
        );
      } else {
        this.clippingBrushes.composite = this.clippingBrushes.x.clone();
      }
    } else {
      if (this.clippingBrushes.composite)
        this.clippingBrushes.composite = this.evaluator.evaluate(
          this.clippingBrushes.composite,
          this.clippingBrushes.x,
          SUBTRACTION
        );
    }
  }

  set clipDepth(b: boolean) {
    if (b) {
      if (this.clippingBrushes.composite) {
        this.clippingBrushes.composite = this.evaluator.evaluate(
          this.clippingBrushes.composite,
          this.clippingBrushes.z,
          ADDITION
        );
      } else {
        this.clippingBrushes.composite = this.clippingBrushes.z.clone();
      }
    } else {
      if (this.clippingBrushes.composite) {
        this.clippingBrushes.composite = this.evaluator.evaluate(
          this.clippingBrushes.composite,
          this.clippingBrushes.z,
          SUBTRACTION
        );
      }
    }
  }

  createClippingBrushX(): Brush {
    const columnLayoutGroup = this.houseGroup.activeLayoutGroup;

    const { halfSize } = columnLayoutGroup.obb;

    const width = halfSize.x + C;
    const height = halfSize.y * 2 + C;
    const depth = halfSize.z * 2 + C;

    const x = width / 2;
    const y = halfSize.y;
    const z = halfSize.z;

    const clippingBrushX = new Brush(
      new BoxGeometry(width, height, depth),
      clippingMaterial
    );
    clippingBrushX.position.set(x, y, z);
    clippingBrushX.updateMatrixWorld();

    return clippingBrushX;
  }

  createClippingBrushY(rowIndex: number): Brush {
    const columnLayoutGroup = this.houseGroup.activeLayoutGroup;

    const {
      userData: { layout },
    } = columnLayoutGroup;

    return pipe(
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
        const { halfSize } = columnLayoutGroup.obb;

        const width = halfSize.x * 2 + C;
        const height = halfSize.y * 2 + C;
        const depth = 999; //  halfSize.z * 2 + C;

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
      someOrError(`could not createClippingBrushY`)
    );
  }

  createClippingBrushZ() {
    const columnLayoutGroup = this.houseGroup.activeLayoutGroup;

    const { halfSize } = columnLayoutGroup.obb;

    const width = halfSize.x * 2 + C;
    const height = halfSize.y * 2 + C;
    const depth = halfSize.z + C;

    const x = 0;
    const y = halfSize.y;
    const z = depth / 2 + halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      clippingMaterial
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    return clippingBrush;
  }

  // updateClippedBrushes() {
  //   if (this.clipWidth || this.clipHeight !== null || this.clipDepth) {
  //     this.createClippedBrushes();
  //   } else {
  //     this.destroyClippedBrushes();
  //   }
  // }

  destroyClippedBrushes() {
    this.houseGroup.traverse((node) => {
      if (node instanceof ClippedElementBrush) {
        node.removeFromParent();
      }
    });
  }

  debugClippingBrush(scene: Scene, visible: boolean) {
    if (!this.clippingBrushes.composite) return;

    if (visible && !scene.children.includes(this.clippingBrushes.composite))
      scene.add(this.clippingBrushes.composite);
    else if (
      !visible &&
      scene.children.includes(this.clippingBrushes.composite)
    )
      scene.remove(this.clippingBrushes.composite);
  }

  createClippedBrushes() {
    this.destroyClippedBrushes();

    if (!this.clippingBrushes.composite) return;

    this.houseGroup.traverse((node) => {
      if (isModuleGroup(node)) {
        node.createClippedBrushes(this.clippingBrushes.composite!);
      }
    });
  }

  showClippedBrushes() {
    this.houseGroup.activeLayoutGroup.traverse((node) => {
      if (node instanceof FullElementBrush) {
        node.visible = false;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = true;
      }
    });
  }

  showElementBrushes() {
    this.houseGroup.activeLayoutGroup.traverse((node) => {
      if (node instanceof FullElementBrush) {
        node.visible = true;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = false;
      }
    });
  }
}

export default CutsManager;
