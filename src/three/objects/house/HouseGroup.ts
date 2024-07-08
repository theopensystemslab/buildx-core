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
import { House } from "@/user-data/houses";

type HouseGroupHooks = {
  onHouseCreate?: (house: House) => void;
  onHouseUpdate?: (houseId: string, changes: Partial<House>) => void;
  onHouseDelete?: (house: House) => void;
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
    position = { x: 0, y: 0, z: 0 },
    rotation = 0,
  }: {
    userData: HouseGroupUserData;
    initialColumnLayoutGroup: ColumnLayoutGroup;
    hooks?: HouseGroupHooks;
    position?: { x: number; y: number; z: number };
    rotation?: number;
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

    console.log({ position });

    this.position.set(position.x, position.y, position.z);
    this.rotation.setFromVector3(new Vector3(0, rotation, 0));
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
    this.hooks?.onHouseDelete?.(this.house);
    // how is the housesDB managed?
  }

  get house(): House {
    const {
      userData: { systemId, houseId, friendlyName, houseTypeId },
      position,
      rotation: { y: rotation },
      activeLayoutGroup,
    } = this;

    return pipe(
      activeLayoutGroup,
      O.match(
        () => {
          throw new Error(`no activeLayoutGroup in houseGroup`);
        },
        (activeLayoutGroup) => {
          const {
            userData: { dnas },
          } = activeLayoutGroup;

          return {
            systemId,
            houseId,
            activeElementMaterials: {},
            dnas,
            friendlyName,
            houseTypeId,
            position,
            rotation,
          };
        }
      )
    );
  }
}
