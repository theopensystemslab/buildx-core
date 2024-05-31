import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import TransformsManager from "@/three/managers/TransformsManager";
import { findFirstGuardUp } from "@/three/utils/sceneQueries";
import { someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group, Scene } from "three";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import ModeManager from "@/three/managers/ModeManager";
import ZStretchManager2 from "@/three/managers/ZStretchManager2";
import CutsManager2 from "@/three/managers/CutsManager2";

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
  modeManager: ModeManager;
  cutsManager: CutsManager2;
  zStretchManager: ZStretchManager2;

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
    this.zStretchManager = new ZStretchManager2(this);
    this.modeManager = new ModeManager(this);
    this.cutsManager = new CutsManager2(this);
  }

  get activeLayoutGroup(): ColumnLayoutGroup {
    return this.layoutsManager.activeLayoutGroup;
  }

  get scene(): Scene {
    return pipe(
      this,
      findFirstGuardUp((o): o is Scene => o instanceof Scene),
      someOrError(`scene not found above HouseGroup`)
    );
  }
}
