import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import ModeManager from "@/three/managers/ModeManager";
import XStretchManager from "@/three/managers/XStretchManager";
import ZStretchManager from "@/three/managers/ZStretchManager";
import { findFirstGuardUp } from "@/three/utils/sceneQueries";
import { O, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group, Vector3 } from "three";
import BuildXScene from "../scene/BuildXScene";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";

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

  elementsManager?: ElementsManager;
  layoutsManager?: LayoutsManager;
  modeManager?: ModeManager;
  xStretchManager?: XStretchManager;

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
    this.layoutsManager = new LayoutsManager(this);
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

  get activeLayoutGroup(): O.Option<ColumnLayoutGroup> {
    return O.fromNullable(this.layoutsManager?.activeLayoutGroup);
  }

  get cutsManager(): CutsManager {
    return this.activeLayoutGroup.cutsManager;
  }

  get zStretchManager(): ZStretchManager {
    return this.activeLayoutGroup.zStretchManager;
  }

  get scene(): BuildXScene {
    return pipe(
      this,
      findFirstGuardUp((o): o is BuildXScene => o instanceof BuildXScene),
      someOrError(`scene not found above HouseGroup`)
    );
  }

  move(v: Vector3) {
    this.position.add(v);
    // this.cutsManager.syncObjectCuts(this.activeLayoutGroup);
  }

  delete() {
    this.removeFromParent();
    this.hooks?.onDelete?.(this);
    // how is the housesDB managed?
  }
}
