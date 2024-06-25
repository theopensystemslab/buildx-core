import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import ModeManager from "@/three/managers/ModeManager";
import TransformsManager from "@/three/managers/TransformsManager";
import XStretchManager from "@/three/managers/XStretchManager";
import ZStretchManager from "@/three/managers/ZStretchManager";
import { findFirstGuardUp } from "@/three/utils/sceneQueries";
import { someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group, Scene, Vector3 } from "three";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import CutsManager from "@/three/managers/CutsManager";

type HouseGroupHooks = {
  onCreate?: (houseGroup: HouseGroup) => void;
  onUpdate?: (houseGroup: HouseGroup) => void;
  onDelete?: (houseGroup: HouseGroup) => void;
};

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
  zStretchManager: ZStretchManager;
  xStretchManager: XStretchManager;

  hooks?: HouseGroupHooks;

  constructor({
    userData,
    initialColumnLayoutGroup,
    hooks,
  }: {
    userData: HouseGroupUserData;
    initialColumnLayoutGroup: ColumnLayoutGroup;
    hooks?: HouseGroupHooks;
  }) {
    super();
    this.add(initialColumnLayoutGroup);
    this.userData = userData;
    this.modeManager = new ModeManager(this);
    this.elementsManager = new ElementsManager(this);
    this.transformsManager = new TransformsManager(this);
    this.layoutsManager = new LayoutsManager(initialColumnLayoutGroup);
    this.zStretchManager = new ZStretchManager(this);
    this.xStretchManager = new XStretchManager(this);
    this.hooks = hooks;
  }

  // questionable
  clone(recursive = true) {
    if (!recursive)
      throw new Error(`HouseGroup.clone called without recursive`);

    return new HouseGroup({
      userData: { ...this.userData },
      initialColumnLayoutGroup: this.layoutsManager.activeLayoutGroup.clone(),
    }) as this;
  }

  get activeLayoutGroup(): ColumnLayoutGroup {
    return this.layoutsManager.activeLayoutGroup;
  }

  get cutsManager(): CutsManager {
    return this.activeLayoutGroup.cutsManager;
  }

  get scene(): Scene {
    return pipe(
      this,
      findFirstGuardUp((o): o is Scene => o instanceof Scene),
      someOrError(`scene not found above HouseGroup`)
    );
  }

  move(v: Vector3) {
    this.position.add(v);
    this.cutsManager.recomputeClipping();
  }

  delete() {
    this.removeFromParent();
    this.hooks?.onDelete?.(this);
    // how is the housesDB managed?
  }
}
