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

class CutsManager {
  rootGroup: Group;
  obb: OBB;
  clippingBrush: Brush;
  clipWidth: boolean;
  clipDepth: boolean;
  clipHeight: number | null;
  scene: Scene;

  constructor(rootGroup: Group, obb: OBB) {
    this.rootGroup = rootGroup;
    this.obb = obb;
    this.clipWidth = false;
    this.clipDepth = false;
    this.clipHeight = null;
    this.scene = rootGroup.parent as Scene;
    this.clippingBrush = new Brush();
  }

  setClippingBrush = () => {
    const { clipWidth, clipHeight, clipDepth } = this;
    const { halfSize } = this.obb;

    const width = clipWidth ? halfSize.x : halfSize.x * 2;
    const height = halfSize.y * 2;
    const depth = clipDepth ? halfSize.z : halfSize.z * 2;

    const x = clipWidth ? halfSize.x / 2 : 0;
    const y = clipHeight !== null ? 0 : halfSize.y;
    const z = clipDepth ? (halfSize.z / 2) * 3 : halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      new MeshBasicMaterial({
        color: "white",
        side: DoubleSide,
        // transparent: true,
        // opacity: 0.5,
      })
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    // if (this.clippingBrush.parent !== null)
    //   this.clippingBrush.removeFromParent();

    this.clippingBrush = clippingBrush;

    // this.scene.add(this.clippingBrush);

    // this.rootGroup.add(clippingBrush);
    // this.updateElementBrushes();
  };

  updateElementBrushes = () => {
    if (this.clipWidth || this.clipHeight !== null || this.clipDepth) {
      console.log("path a");
      this.createClippedBrushes();
      this.showClippedBrushes();
    } else {
      console.log("path b");
      this.destroyClippedBrushes();
      this.showElementBrushes();
    }
  };

  // createZCutBrush = (): Brush => {
  //   const { halfSize } = this.obb;
  //   const clippingBrush = new Brush(
  //     new BoxGeometry(halfSize.x * 4, halfSize.y * 4, halfSize.z),
  //     new MeshBasicMaterial({
  //       color: "white",
  //       side: DoubleSide,
  //       transparent: true,
  //       opacity: 0.5,
  //     })
  //   );
  //   clippingBrush.position.set(0, halfSize.y * 2, (halfSize.z / 2) * 3);
  //   clippingBrush.scale.setScalar(1.1);
  //   clippingBrush.updateMatrixWorld();
  //   return clippingBrush;
  // };

  destroyClippedBrushes = () => {
    this.rootGroup.traverse((node) => {
      if (isClippedBrush(node)) {
        node.removeFromParent();
      }
    });
  };

  createClippedBrushes = () => {
    this.destroyClippedBrushes();

    this.rootGroup.traverse((node) => {
      if (isModuleGroup(node)) {
        console.log(`creating`, this.clippingBrush);
        node.createClippedBrushes(this.clippingBrush);
      }
    });
  };

  showClippedBrushes = () => {
    this.rootGroup.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = false;
      } else if (isClippedBrush(node)) {
        node.visible = true;
      }
    });
  };

  showElementBrushes() {
    this.rootGroup.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = true;
      } else if (isClippedBrush(node)) {
        node.visible = false;
      }
    });
  }

  // setVerticalCutX = (visible: boolean) => {
  //   // Logic to handle the vertical cut along the x-axis
  //   console.log("Vertical cut X:", visible);
  //   this.setClippingBrush();
  //   this.createClippedBrushes();
  // };

  // setVerticalCutZ = (visible: boolean) => {
  //   // Logic to handle the vertical cut along the z-axis
  //   console.log("Vertical cut Z:", visible);

  //   this.createClippedBrushes();

  //   if (visible) {
  //     this.showClippedBrushes();
  //   } else {
  //     this.showElementBrushes();
  //   }
  // };
}

export default CutsManager;
