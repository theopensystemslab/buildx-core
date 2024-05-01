import { Group, Vector3 } from "three";
import TransformsManager from "../managers/TransformsManager";
import { HouseGroup } from "./house/HouseGroup";

class HousesGroup extends Group {
  transformsManager: TransformsManager;
  declare children: HouseGroup[];

  constructor() {
    super();
    this.transformsManager = new TransformsManager(this);
  }

  // hmmm...
  moveHouse(house: HouseGroup, delta: Vector3) {
    console.log(house, delta);
    // detect collision
  }

  checkCollisions() {}

  computeNearNeighbours(houseGroup: HouseGroup) {
    console.log(houseGroup);
    return this.children.filter;
  }
}

export default HousesGroup;
