import { HouseGroup } from "../objects/house/HouseGroup";

interface StretchManager {
  gestureStart: (side: 1 | -1) => void;
  gestureEnd: () => void;
  gestureProgress: (delta: number) => void;
  houseGroup: HouseGroup;
}

export default StretchManager;
