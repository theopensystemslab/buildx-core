import { Object3D } from "three";
import { OutlinePass } from "three-stdlib";
import { ElementBrush } from "@/three/objects/house/ElementGroup";
import { SceneContextModeLabel } from "@/three/managers/ContextManager";

class OutlineManager {
  private outlinePass: OutlinePass;
  private hoveredBrush: ElementBrush | null = null;
  private currentMode: SceneContextModeLabel;

  constructor(outlinePass: OutlinePass) {
    this.outlinePass = outlinePass;
    this.currentMode = "SITE";
  }

  private getOutlineObjects(brush: ElementBrush): Object3D[] {
    switch (this.currentMode) {
      case "SITE":
        return brush.houseGroup.getAllVisibleBrushes();
      case "BUILDING":
        return brush.houseGroup.getElementBrushes(
          brush.elementGroup.userData.element.ifcTag
        );
      case "ROW":
        return brush.moduleGroup.getAllVisibleBrushes();
      default:
        return [];
    }
  }

  setMode(mode: SceneContextModeLabel) {
    this.currentMode = mode;
    if (this.hoveredBrush) {
      this.setHoveredObject(this.hoveredBrush);
    }
  }

  setHoveredObject(object: Object3D | null) {
    if (object instanceof ElementBrush) {
      if (object !== this.hoveredBrush) {
        this.hoveredBrush = object;
        this.outlinePass.selectedObjects = this.getOutlineObjects(object);
      }
    } else {
      if (this.hoveredBrush !== null) {
        this.hoveredBrush = null;
        this.outlinePass.selectedObjects = [];
      }
    }
  }

  dispose() {
    this.hoveredBrush = null;
    this.outlinePass.selectedObjects = [];
  }
}

export default OutlineManager;
