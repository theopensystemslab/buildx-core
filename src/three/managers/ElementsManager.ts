import { ElementGroup } from "../objects/house/ElementGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { setVisibilityDown } from "../utils";

class ElementsManager {
  houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  setAllElementsVisibility(visible: boolean) {
    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        setVisibilityDown(node, visible);
      }
    });
  }

  setCategoryVisibility(category: string, visible: boolean) {
    this.houseGroup.traverse((node) => {
      if (
        node instanceof ElementGroup &&
        node.userData.element.category === category
      ) {
        setVisibilityDown(node, visible);
      }
    });
  }
}

export default ElementsManager;
