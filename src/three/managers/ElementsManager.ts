import { ElementGroup } from "../objects/house/ElementGroup";
import { HouseGroup } from "../objects/house/HouseGroup";

class ElementsManager {
  houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  setAllElementsVisibility(visible: boolean) {
    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        node.visible = visible;
      }
    });
  }

  setCategoryVisibility(category: string, visible: boolean) {
    this.houseGroup.traverse((node) => {
      if (
        node instanceof ElementGroup &&
        node.userData.element.category === category
      ) {
        node.visible = visible;
      }
    });
  }
}

export default ElementsManager;
