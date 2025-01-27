import { Object3D } from "three";
import { OutlinePass } from "three-stdlib";
import { ElementBrush } from "../objects/house/ElementGroup";
import BuildXScene from "../objects/scene/BuildXScene";
import { SceneContextModeLabel } from "./ContextManager";
import StretchHandleMesh from "../objects/handles/StretchHandleMesh";
class OutlineManager {
  // private hoveredObject: Object3D | null = null;
  // private selectedObject: Object3D | null = null;
  // private outlinedBrushes: ElementBrush[] = [];
  private outlinePass: OutlinePass;
  private selectedBrush: ElementBrush | null;
  private hoveredBrush: ElementBrush | null;
  private scene: BuildXScene;

  constructor(scene: BuildXScene, outlinePass: OutlinePass) {
    this.scene = scene;
    this.outlinePass = outlinePass;
    this.selectedBrush = null;
    this.hoveredBrush = null;
  }

  private getOutlineObjects(brush: ElementBrush): Object3D[] {
    if (!this.scene.contextManager) return [];

    const mode = this.scene.contextManager.mode.label;

    switch (mode) {
      case SceneContextModeLabel.Enum.SITE:
        return brush.houseGroup.getAllVisibleBrushes();
      case SceneContextModeLabel.Enum.BUILDING:
        return brush.houseGroup.getElementBrushes(
          brush.elementGroup.userData.element.ifcTag
        );
      case SceneContextModeLabel.Enum.ROW:
        return brush.moduleGroup.getAllVisibleBrushes();
      default:
        return [];
    }
  }

  setHoveredObject(object: Object3D | null) {
    switch (true) {
      case object instanceof ElementBrush:
        if (object !== this.hoveredBrush) {
          this.hoveredBrush = object;
          this.outlinePass.selectedObjects = this.getOutlineObjects(object);
        }
        break;
      case object instanceof StretchHandleMesh:
        object.manager.onHandleHover?.(object.side);
        break;
      default:
        if (this.hoveredBrush !== null) {
          if (this.hoveredBrush !== null) {
            this.hoveredBrush = null;
            this.outlinePass.selectedObjects = [];
          }
        }
    }
  }

  setSelectedObject(object: Object3D | null) {
    if (object instanceof ElementBrush) {
      if (object !== this.selectedBrush) {
        this.selectedBrush = object;
        this.outlinePass.selectedObjects = this.getOutlineObjects(object);
      }
    } else {
      this.outlinePass.selectedObjects = [];
    }
  }

  dispose() {
    // Clear references
    this.selectedBrush = null;
    this.hoveredBrush = null;
    this.outlinePass.selectedObjects = [];
  }
}

export default OutlineManager;
