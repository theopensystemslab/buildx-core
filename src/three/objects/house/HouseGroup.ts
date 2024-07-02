import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import XStretchManager from "@/three/managers/XStretchManager";
import ZStretchManager from "@/three/managers/ZStretchManager";
import { findFirstGuardUp } from "@/three/utils/sceneQueries";
import { O, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group, Vector3 } from "three";
import BuildXScene from "../scene/BuildXScene";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import OpeningsManager from "@/three/managers/OpeningsManager";

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
  layoutsManager: LayoutsManager;
  xStretchManager?: XStretchManager;
  zStretchManager?: ZStretchManager;
  cutsManager?: CutsManager;
  openingsManager?: OpeningsManager;
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
    this.elementsManager = new ElementsManager(this);
    this.layoutsManager = new LayoutsManager(this);
    this.layoutsManager.activeLayoutGroup = initialColumnLayoutGroup;
    this.zStretchManager = new ZStretchManager(this);
    this.xStretchManager = new XStretchManager(this);
    this.cutsManager = new CutsManager(this);
    this.openingsManager = new OpeningsManager(this);
    this.hooks = hooks;
  }

  get activeLayoutGroup(): O.Option<ColumnLayoutGroup> {
    return pipe(
      this.layoutsManager,
      O.fromNullable,
      O.chain((x) => x.activeLayoutGroup)
    );
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
