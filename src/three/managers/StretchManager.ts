import { HouseGroup } from "../objects/house/HouseGroup";

interface StretchManager {
  houseGroup: HouseGroup;
  gestureStart: (side: 1 | -1) => void;
  gestureEnd: () => void;
  gestureProgress: (delta: number) => void;
  showHandles: () => void;
  hideHandles: () => void;
}

export default StretchManager;
