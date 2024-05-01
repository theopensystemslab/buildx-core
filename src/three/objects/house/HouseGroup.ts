import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import TransformsManager from "@/three/managers/TransformsManager";
import { Group } from "three";

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

  constructor({ ...userData }: HouseGroupUserData & {}) {
    super();
    this.userData = userData;
    this.elementsManager = new ElementsManager(this);
    this.layoutsManager = new LayoutsManager(this);
    this.transformsManager = new TransformsManager(this);
  }
}
