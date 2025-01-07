import { HouseGroup } from "../../objects/house/HouseGroup";

export abstract class AbstractStretchManager {
  houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  abstract init(): void;
  abstract gestureStart(side: 1 | -1): void;

  /**
   * Handles the progress of a stretch gesture
   * @param delta The change in position since the last progress event (not the total change from gesture start).
   *             This value is already normalized to the relevant axis (x for XStretchManager, z for ZStretchManager)
   *             and accounts for the house's rotation.
   */
  abstract gestureProgress(delta: number): void;

  abstract gestureEnd(): void;
  abstract showHandles(): void;
  abstract hideHandles(): void;
  abstract cleanup(): void;

  onHandleHover?(side: 1 | -1): void;
}

export abstract class AbstractXStretchManager extends AbstractStretchManager {}

export abstract class AbstractZStretchManager extends AbstractStretchManager {}
