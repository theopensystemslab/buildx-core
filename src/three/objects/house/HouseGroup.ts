import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import TransformsManager from "@/three/managers/TransformsManager";
import { Group } from "three";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import CutsManager from "@/three/managers/CutsManager";

export type HouseGroupUserData = {
  systemId: string;
  houseId: string;
  houseTypeId: string;
  friendlyName: string;
};

export class HouseGroup extends Group {
  userData: HouseGroupUserData;

  elementsManager: ElementsManager;
  layoutsManager: LayoutsManager;
  transformsManager: TransformsManager;
  cutsManager: CutsManager;

  constructor({
    userData,
    initialColumnLayoutGroup,
  }: {
    userData: HouseGroupUserData;
    initialColumnLayoutGroup: ColumnLayoutGroup;
  }) {
    super();
    this.add(initialColumnLayoutGroup);
    this.userData = userData;
    this.elementsManager = new ElementsManager(this);
    this.transformsManager = new TransformsManager(this);
    this.layoutsManager = new LayoutsManager(initialColumnLayoutGroup);
    this.cutsManager = new CutsManager(this);
  }

  getActiveLayoutGroup() {
    return this.layoutsManager.activeLayoutGroup;
  }
}
