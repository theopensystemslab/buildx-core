import { BoxGeometry, DoubleSide, Group, MeshBasicMaterial } from "three";
import { Brush } from "three-bvh-csg";
import { OBB } from "three-stdlib";
import { isClippedBrush, isElementBrush } from "../objects/house/ElementGroup";
import { isModuleGroup } from "../objects/house/ModuleGroup";

class CutsManager {
  rootGroup: Group;
  obb: OBB;
  // xCutBrush: Brush;
  zCutBrush: Brush;

  constructor(rootGroup: Group, obb: OBB) {
    this.rootGroup = rootGroup;
    this.obb = obb;
    console.log(obb);
    this.zCutBrush = this.createZCutBrush();
  }

  createZCutBrush = (): Brush => {
    const { halfSize } = this.obb;
    const clippingBrush = new Brush(
      new BoxGeometry(halfSize.x * 4, halfSize.y * 4, halfSize.z),
      new MeshBasicMaterial({
        color: "white",
        side: DoubleSide,
        transparent: true,
        opacity: 0.5,
      })
    );
    clippingBrush.position.set(0, halfSize.y * 2, (halfSize.z / 2) * 3);
    clippingBrush.scale.setScalar(1.1);
    clippingBrush.updateMatrixWorld();
    return clippingBrush;
  };

  destroyClippedBrushes = () => {
    this.rootGroup.traverse((node) => {
      if (isClippedBrush(node)) {
        node.removeFromParent();
      }
    });
  };

  createClippedBrushes = (clippingBrush: Brush) => {
    this.destroyClippedBrushes();

    this.rootGroup.traverse((node) => {
      if (isModuleGroup(node)) {
        node.createClippedBrushes(clippingBrush);
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

  setVerticalCutX = (visible: boolean) => {
    // Logic to handle the vertical cut along the x-axis
    console.log("Vertical cut X:", visible);
  };

  setVerticalCutZ = (visible: boolean) => {
    // Logic to handle the vertical cut along the z-axis
    console.log("Vertical cut Z:", visible);

    this.createClippedBrushes(this.zCutBrush);

    if (visible) {
      this.showClippedBrushes();
    } else {
      this.showElementBrushes();
    }
  };
}

export default CutsManager;
