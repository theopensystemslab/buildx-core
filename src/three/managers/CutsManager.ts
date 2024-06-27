import { A, O, compareProps, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { BoxGeometry, DoubleSide, MeshBasicMaterial, Object3D } from "three";
import { ADDITION, Brush, Evaluator } from "three-bvh-csg";
import { ElementGroup } from "../objects/house/ElementGroup";
import { HouseGroup } from "../objects/house/HouseGroup";

export const evaluator = new Evaluator();

const PAD = 5;

const clippingMaterial = new MeshBasicMaterial({
  color: "white",
  side: DoubleSide,
});

class CutsManager {
  private houseGroup: HouseGroup;

  private clippingBrushes: {
    x?: Brush;
    y?: Brush;
    z?: Brush;
  };
  private brush: O.Option<Brush>;
  settings: {
    x: boolean;
    z: boolean;
    rowIndex: number | null;
  };
  debugged: boolean;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.clippingBrushes = {};
    this.brush = O.none;
    this.settings = {
      rowIndex: null,
      x: false,
      z: false,
    };
    this.debugged = false;
  }

  debugClippingBrush() {
    pipe(
      this.brush,
      O.map((brush) => {
        if (this.debugged) {
          this.houseGroup.scene.remove(brush);
          this.debugged = false;
        } else {
          this.houseGroup.scene.add(brush);
          this.debugged = true;
        }
      })
    );
  }

  private createClippingBrushX() {
    return pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const {
          obb: { halfSize },
        } = activeLayoutGroup;

        const width = halfSize.x + PAD;
        const height = halfSize.y * 2 + PAD;
        const depth = halfSize.z * 2 + PAD;

        const x = width / 2;
        const y = halfSize.y;
        const z = 0;

        const clippingBrush = new Brush(
          new BoxGeometry(width, height, depth),
          clippingMaterial
        );
        clippingBrush.position.set(x, y, z);
        clippingBrush.updateMatrixWorld();

        this.clippingBrushes.x = clippingBrush;

        return this.clippingBrushes.x;
      })
    );
  }

  private createClippingBrushZ() {
    return pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const {
          obb: { halfSize },
        } = activeLayoutGroup;

        const width = halfSize.x * 2 + PAD;
        const height = halfSize.y * 2 + PAD;
        const depth = halfSize.z + PAD;

        const x = 0;
        const y = halfSize.y;
        const z = depth / 2;

        const clippingBrush = new Brush(
          new BoxGeometry(width, height, depth),
          clippingMaterial
        );
        clippingBrush.position.set(x, y, z);
        clippingBrush.updateMatrixWorld();

        this.clippingBrushes.z = clippingBrush;

        return this.clippingBrushes.z;
      })
    );
  }

  private createClippingBrushY(rowIndex: number) {
    return pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const {
          userData: { layout },
          obb: { halfSize },
        } = activeLayoutGroup;

        const clippingBrush = pipe(
          layout,
          A.head,
          O.chain(({ positionedRows }) =>
            pipe(positionedRows, A.lookup(rowIndex))
          ),
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
            const z = 0; // halfSize.z;

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
      })
    );
  }

  private createClippedBrushes(object: Object3D) {
    pipe(
      this.brush,
      O.map((brush) => {
        object.traverse((node) => {
          if (node instanceof ElementGroup) {
            node.createClippedBrush(brush);
          }
        });
      })
    );
  }

  showClippedBrushes(object: Object3D) {
    object.traverse((node) => {
      if (node instanceof ElementGroup) {
        node.showClippedBrush();
      }
    });
  }

  showElementBrushes(object: Object3D) {
    object.traverse((node) => {
      if (node instanceof ElementGroup) {
        node.showFullBrush();
      }
    });
  }

  showAppropriateBrushes(object: Object3D) {
    const { rowIndex, x, z } = this.settings;

    if (rowIndex !== null || x || z) {
      this.showClippedBrushes(object);
    } else {
      this.showElementBrushes(object);
    }
  }

  setClippingBrush(settings: typeof this.settings) {
    this.settings = settings;

    const { x, z, rowIndex } = settings;

    this.brush = O.none;

    if (x) {
      this.brush = this.createClippingBrushX();
    }
    if (z) {
      this.brush = pipe(
        this.createClippingBrushZ(),
        O.match(
          () => this.brush,
          (brushZ) =>
            pipe(
              this.brush,
              O.match(
                () => brushZ,
                (brushX) => evaluator.evaluate(brushX, brushZ, ADDITION)
              ),
              O.some
            )
        )
      );
    }
    if (rowIndex !== null) {
      this.brush = pipe(
        this.createClippingBrushY(rowIndex),
        O.match(
          () => this.brush,
          (brushY) =>
            pipe(
              this.brush,
              O.match(
                () => brushY,
                (brushXZ) => evaluator.evaluate(brushXZ, brushY, ADDITION)
              ),
              O.some
            )
        )
      );
    }

    pipe(
      this.brush,
      O.map((brush) => {
        console.log(`brush`, brush);
        // brush.rotation.y = this.houseGroup.rotation.y;
        // brush.position.setX(this.houseGroup.position.x);
        // brush.position.setZ(this.houseGroup.position.z);
        // brush.updateMatrixWorld();
      })
    );
  }

  setXCut(v: boolean) {
    this.setClippingBrush({
      ...this.settings,
      x: v,
    });
  }

  toggleXCut() {
    this.setXCut(!this.settings.x);
  }

  setZCut(v: boolean) {
    this.setClippingBrush({
      ...this.settings,
      z: v,
    });
  }

  toggleZCut() {
    this.setZCut(!this.settings.z);
  }

  setRowCut(rowIndex: number | null) {
    this.setClippingBrush({
      ...this.settings,
      rowIndex,
    });
  }

  toggleGroundCut() {
    this.setRowCut(this.settings.rowIndex === null ? 1 : null);
  }

  syncActiveLayout() {
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        this.createObjectCuts(activeLayoutGroup);
        this.showAppropriateBrushes(activeLayoutGroup);
      })
    );
  }

  createObjectCuts(object: Object3D) {
    const brush = this.brush;

    if (brush !== null) {
      this.createClippedBrushes(object);
    }
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
