import { A, O, compareProps, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import {
  BoxGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from "three";
import { ADDITION, Brush, Evaluator } from "three-bvh-csg";
import { HouseGroup } from "../objects/house/HouseGroup";
import { ModuleGroup } from "../objects/house/ModuleGroup";

export const evaluator = new Evaluator();

const PAD = 5;

export const clippingMaterial = new MeshBasicMaterial({
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
  private brush: Brush | null;
  settings: {
    x: boolean;
    z: boolean;
    rowIndex: number | null;
  };
  private debugTimeout?: NodeJS.Timeout;
  private debuggedBrush?: Brush;
  private debug: boolean = false;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.clippingBrushes = {};
    this.brush = null;
    this.settings = {
      rowIndex: null,
      x: false,
      z: false,
    };
  }

  setDebug(enabled: boolean) {
    this.debug = enabled;
  }

  debugClippingBrush() {
    if (!this.debug) return;

    if (this.brush) {
      if (this.debugTimeout) {
        clearTimeout(this.debugTimeout);
        this.debugTimeout = undefined;
      }

      if (this.debuggedBrush) {
        console.log(`removing ${this.debuggedBrush.id}`);
        this.houseGroup.scene?.remove(this.debuggedBrush);
        this.debuggedBrush = undefined;
      }

      console.log(`adding ${this.brush.id}`);
      this.houseGroup.scene?.add(this.brush);
      this.debuggedBrush = this.brush;

      this.debugTimeout = setTimeout(() => {
        if (this.debuggedBrush) {
          console.log(`removing ${this.debuggedBrush.id}`);
          this.houseGroup.scene?.remove(this.debuggedBrush);
          this.debuggedBrush = undefined;
        }
        this.debugTimeout = undefined;
      }, 500);
    }
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
          O.map((rowHeight) => {
            const width = halfSize.x * 2 + PAD;

            const height = halfSize.y * 2 + PAD;
            const depth = 999;

            const x = 0;
            const y = height / 2 + rowHeight;
            const z = 0;

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

  createClippedBrushes(object: Object3D) {
    pipe(
      this.brush,
      O.fromNullable,
      O.map((brush) => {
        object.traverse((node) => {
          if (node instanceof ModuleGroup) {
            node.createClippedBrush(brush);
          }
        });
      })
    );
  }

  showClippedBrushes(object: Object3D) {
    object.traverse((node) => {
      if (node instanceof ModuleGroup) {
        node.showClippedBrushes();
        node.updateElementBrushes();
      }
    });
  }

  showFullBrushes(object: Object3D) {
    object.traverse((node) => {
      if (node instanceof ModuleGroup) {
        node.showFullBrushes();
        node.updateElementBrushes();
      }
    });
  }

  showAppropriateBrushes(object: Object3D) {
    const { rowIndex, x, z } = this.settings;

    if (rowIndex !== null || x || z) {
      this.showClippedBrushes(object);
    } else {
      this.showFullBrushes(object);
    }
    this.debugClippingBrush();
  }

  setClippingBrush(settings: typeof this.settings) {
    this.settings = settings;

    const { x, z, rowIndex } = settings;

    let nextBrush: O.Option<Brush> = O.none;

    if (x) {
      nextBrush = this.createClippingBrushX();
    }
    if (z) {
      nextBrush = pipe(
        this.createClippingBrushZ(),
        O.match(
          () => nextBrush,
          (brushZ) =>
            pipe(
              nextBrush,
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
      nextBrush = pipe(
        this.createClippingBrushY(rowIndex),
        O.match(
          () => nextBrush,
          (brushY) =>
            pipe(
              nextBrush,
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
      nextBrush,
      O.match(
        () => {
          this.brush = null;
        },
        (brush) => {
          this.brush = brush;

          this.brush.rotation.y = this.houseGroup.rotation.y;

          this.brush.position.applyAxisAngle(
            new Vector3(0, 1, 0),
            this.houseGroup.rotation.y
          );
          this.brush.position.add(this.houseGroup.position);

          this.brush.updateMatrixWorld();
        }
      )
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
        this.createClippedBrushes(activeLayoutGroup);
        this.showAppropriateBrushes(activeLayoutGroup);
      })
    );
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
