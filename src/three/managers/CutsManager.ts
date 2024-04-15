import {
  BoxGeometry,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  Scene,
} from "three";
import { Brush } from "three-bvh-csg";
import { OBB } from "three-stdlib";
import { isClippedBrush, isElementBrush } from "../objects/house/ElementGroup";
import { isModuleGroup } from "../objects/house/ModuleGroup";

const C = 2;

class CutsManager {
  rootGroup: Group & { obb: OBB };
  clippingBrush: Brush;
  clipWidth: boolean;
  clipDepth: boolean;
  clipHeight: number | null;

  constructor(rootGroup: Group & { obb: OBB }) {
    this.rootGroup = rootGroup;
    this.clipWidth = false;
    this.clipDepth = false;
    this.clipHeight = null;
    this.clippingBrush = new Brush();
  }

  // createClippingBrush() {
  //   const { clipWidth, clipHeight, clipDepth } = this;
  //   const { halfSize } = this.rootGroup.obb;

  //   const width = clipWidth ? halfSize.x : halfSize.x * 2;
  //   const height = halfSize.y * 4;
  //   const depth = clipDepth ? halfSize.z : halfSize.z * 2;

  //   const x = clipWidth ? halfSize.x / 2 : 0;
  //   const y = clipHeight !== null ? 0 : halfSize.y;
  //   const z = clipDepth ? (halfSize.z / 2) * 3 : halfSize.z;

  //   const clippingBrush = new Brush(
  //     new BoxGeometry(width, height, depth),
  //     new MeshBasicMaterial({
  //       color: "white",
  //       side: DoubleSide,
  //     })
  //   );
  //   clippingBrush.position.set(x, y, z);
  //   clippingBrush.updateMatrixWorld();

  //   return clippingBrush;
  // }

  setClippingBrushX() {
    const { halfSize } = this.rootGroup.obb;

    const width = halfSize.x + C;
    const height = halfSize.y * 2 + C;
    const depth = halfSize.z * 2 + C;

    const x = width / 2;
    const y = halfSize.y;
    const z = halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      new MeshBasicMaterial({
        color: "white",
        side: DoubleSide,
      })
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    this.clippingBrush = clippingBrush;
  }

  setClippingBrushZ() {
    const { halfSize } = this.rootGroup.obb;

    const width = halfSize.x * 2 + C;
    const height = halfSize.y * 2 + C;
    const depth = halfSize.z + C;

    const x = 0;
    const y = halfSize.y;
    const z = depth / 2 + halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      new MeshBasicMaterial({
        color: "white",
        // side: DoubleSide,
      })
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
    this.rootGroup.traverse((node) => {
      if (isClippedBrush(node)) {
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

    this.rootGroup.traverse((node) => {
      if (isModuleGroup(node)) {
        node.createClippedBrushes(this.clippingBrush);
      }
    });
  }

  showClippedBrushes() {
    this.rootGroup.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = false;
      } else if (isClippedBrush(node)) {
        node.visible = true;
      }
    });
  }

  showElementBrushes() {
    this.rootGroup.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = true;
      } else if (isClippedBrush(node)) {
        node.visible = false;
      }
    });
  }
}

export default CutsManager;
