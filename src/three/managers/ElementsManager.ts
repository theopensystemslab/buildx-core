import { Group } from "three";
import { isElementGroup } from "../objects/house/ElementGroup";

class ElementsManager {
  rootGroup: Group;

  constructor(rootGroup: Group) {
    this.rootGroup = rootGroup;
  }

  setAllElementsVisibility(visible: boolean) {
    this.rootGroup.traverse((node) => {
      if (isElementGroup(node)) {
        node.visible = visible;
      }
    });
  }

  setCategoryVisibility(category: string, visible: boolean) {
    this.rootGroup.traverse((node) => {
      if (isElementGroup(node) && node.element.category === category) {
        console.log(node, visible);
        node.visible = visible;
      }
    });
  }
}

export default ElementsManager;
