import { SceneContextModeLabel } from "@/three/managers/ContextManager";
import { ElementBrush } from "@/three/objects/house/ElementGroup";
import { Object3D } from "three";
import { OutlinePass } from "three-stdlib";

class OutlineManager {
  private outlinePass: OutlinePass;
  private hoveredBrush: ElementBrush | null = null;
  private currentMode: SceneContextModeLabel;
  private jsonContainer: HTMLDivElement;

  constructor(outlinePass: OutlinePass) {
    this.outlinePass = outlinePass;
    this.currentMode = "SITE";

    // Create customelementRest, JSON display container
    this.jsonContainer = document.createElement("div");
    this.jsonContainer.style.position = "absolute";
    this.jsonContainer.style.left = "10px";
    this.jsonContainer.style.top = "10px";
    this.jsonContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.jsonContainer.style.color = "#ffffff";
    this.jsonContainer.style.padding = "10px";
    this.jsonContainer.style.borderRadius = "5px";
    this.jsonContainer.style.fontFamily = "monospace";
    this.jsonContainer.style.fontSize = "12px";
    // this.jsonContainer.style.maxWidth = "300px";
    // this.jsonContainer.style.maxHeight = "400px";
    this.jsonContainer.style.overflowY = "auto";
    document.body.appendChild(this.jsonContainer);

    // Initialize params
    this.updateJsonDisplay(null);
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

  private updateJsonDisplay(brush: ElementBrush | null) {
    if (brush) {
      const {
        element: { name, ifcTag, category, defaultMaterial },
      } = brush.elementGroup.userData;
      const { module, ...moduleRest } = brush.moduleGroup.userData;
      const { vanillaModule, ...rowRest } = brush.rowGroup.userData;

      const data = {
        element: { name, ifcTag, category, defaultMaterial },
        module: moduleRest,
        row: rowRest,
        column: brush.columnGroup.userData,
      };
      const formattedJson = JSON.stringify(data, null, 2)
        .replace(
          /[{},]/g,
          (match) => `<span style="color: #88c999">${match}</span>`
        )
        .replace(/"(\w+)":/g, '<span style="color: #e6db74">"$1"</span>:')
        .replace(/: "([^"]+)"/g, ': <span style="color: #66d9ef">"$1"</span>');

      this.jsonContainer.innerHTML = `<pre>${formattedJson}</pre>`;
    } else {
      this.jsonContainer.innerHTML = "<pre>{}</pre>";
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
        this.updateJsonDisplay(object);
      }
    } else {
      if (this.hoveredBrush !== null) {
        this.hoveredBrush = null;
        this.outlinePass.selectedObjects = [];
        this.updateJsonDisplay(null);
      }
    }
  }

  dispose() {
    this.hoveredBrush = null;
    this.outlinePass.selectedObjects = [];
    if (this.jsonContainer && this.jsonContainer.parentNode) {
      this.jsonContainer.parentNode.removeChild(this.jsonContainer);
    }
  }
}

export default OutlineManager;
