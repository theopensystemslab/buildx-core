import { HouseGroup } from "../objects/house/HouseGroup";

abstract class AbstractStretchManager {
  houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  abstract init(): void;
  abstract gestureStart(side: 1 | -1): void;
  abstract gestureEnd(): void;
  abstract gestureProgress(delta: number): void;
  abstract showHandles(): void;
  abstract hideHandles(): void;
  abstract cleanup(): void;
}

export abstract class AbstractXStretchManager extends AbstractStretchManager {}

export abstract class AbstractZStretchManager extends AbstractStretchManager {}

export default AbstractStretchManager;
