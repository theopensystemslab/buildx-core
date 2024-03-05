import { Group } from "three";
import { UserDataTypeEnum } from "./types";

export type GridGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.GridGroup;
  levelIndex: number;
  length: number;
  height: number;
};

export class GridGroup extends Group {
  userData: GridGroupUserData;

  constructor(userData: GridGroupUserData) {
    super();
    this.userData = userData;
  }
}
