import { Group } from "three";
import { isElementGroup } from "../objects/house/ElementGroup";

class ElementsManager {
  root: Group;

  constructor(root: Group) {
    this.root = root;
  }

  setAllElementsVisibility(visible: boolean) {
    this.root.traverse((node) => {
      if (isElementGroup(node)) {
        node.visible = visible;
      }
    });
  }

  setCategoryVisibility(category: string, visible: boolean) {
    this.root.traverse((node) => {
      if (isElementGroup(node) && node.element.category === category) {
        node.visible = visible;
      }
    });
  }
}

export default ElementsManager;
