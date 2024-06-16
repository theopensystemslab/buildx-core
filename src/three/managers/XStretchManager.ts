import { HouseGroup } from "../objects/house/HouseGroup";
import StretchManager from "./StretchManager";

class XStretchManager implements StretchManager {
  houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  gestureStart(_side: 1 | -1) {}
  gestureProgress(_delta: number) {}
  gestureEnd() {}
}

export default XStretchManager;
