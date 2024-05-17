import { A, O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { BoxGeometry, DoubleSide, MeshBasicMaterial, Scene } from "three";
import { Brush } from "three-bvh-csg";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import {
  ClippedElementBrush,
  ElementBrush,
} from "../objects/house/ElementGroup";
import { isModuleGroup } from "../objects/house/ModuleGroup";

const C = 3;

const clippingMaterial = new MeshBasicMaterial({
  color: "white",
  side: DoubleSide,
});

class CutsManager {
  columnLayoutGroup: ColumnLayoutGroup;
  clippingBrush: Brush;
  clipWidth: boolean;
  clipDepth: boolean;
  clipHeight: number | null;

  constructor(columnLayoutGroup: ColumnLayoutGroup) {
    this.columnLayoutGroup = columnLayoutGroup;
    this.clipWidth = false;
    this.clipDepth = false;
    this.clipHeight = null;
    this.clippingBrush = new Brush();
  }

  setClippingBrushX() {
    const { halfSize } = this.columnLayoutGroup.obb;

    const width = halfSize.x + C;
    const height = halfSize.y * 2 + C;
    const depth = halfSize.z * 2 + C;

    const x = width / 2;
    const y = halfSize.y;
    const z = halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      clippingMaterial
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    this.clippingBrush = clippingBrush;
  }

  setClippingBrushY(levelIndex: number) {
    const {
      userData: { layout },
    } = this.columnLayoutGroup;

    pipe(
      layout,
      A.head,
      O.chain(({ positionedRows }) =>
        pipe(positionedRows, A.lookup(levelIndex))
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
        const { halfSize } = this.columnLayoutGroup.obb;

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

        this.clippingBrush = clippingBrush;
      })
    );
  }

  setClippingBrushZ() {
    const { halfSize } = this.columnLayoutGroup.obb;

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

    this.clippingBrush = clippingBrush;
  }

  updateClippedBrushes() {
    if (this.clipWidth || this.clipHeight !== null || this.clipDepth) {
      this.createClippedBrushes();
    } else {
      this.destroyClippedBrushes();
    }
  }

  destroyClippedBrushes() {
    this.columnLayoutGroup.traverse((node) => {
      if (node instanceof ClippedElementBrush) {
        node.removeFromParent();
      }
    });
  }

  debugClippingBrush(scene: Scene, visible: boolean) {
    if (visible && !scene.children.includes(this.clippingBrush))
      scene.add(this.clippingBrush);
    else if (!visible && scene.children.includes(this.clippingBrush))
      scene.remove(this.clippingBrush);
  }

  createClippedBrushes() {
    this.destroyClippedBrushes();

    this.columnLayoutGroup.traverse((node) => {
      if (isModuleGroup(node)) {
        node.createClippedBrushes(this.clippingBrush);
      }
    });
  }

  showClippedBrushes() {
    this.columnLayoutGroup.traverse((node) => {
      if (node instanceof ElementBrush) {
        node.visible = false;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = true;
      }
    });
  }

  showElementBrushes() {
    this.columnLayoutGroup.traverse((node) => {
      if (node instanceof ElementBrush) {
        node.visible = true;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = false;
      }
    });
  }
}

export default CutsManager;
