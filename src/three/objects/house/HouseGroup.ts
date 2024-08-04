import { House } from "@/data/user/houses";
import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import OpeningsManager from "@/three/managers/OpeningsManager";
import XStretchManager from "@/three/managers/XStretchManager";
import ZStretchManager from "@/three/managers/ZStretchManager";
import { hideObject, showObject } from "@/three/utils/layers";
import { findFirstGuardUp } from "@/three/utils/sceneQueries";
import { O, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group, Vector3 } from "three";
import RotateHandlesGroup from "../handles/RotateHandlesGroup";
import BuildXScene from "../scene/BuildXScene";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";

type Hooks = {
  onHouseCreate: (house: House) => void;
  onHouseUpdate: (houseId: string, changes: Partial<House>) => void;
  onHouseDelete: (houseId: string) => void;
};

type Managers = {
  layouts: LayoutsManager;
  elements?: ElementsManager;
  xStretch?: XStretchManager;
  zStretch?: ZStretchManager;
  cuts?: CutsManager;
  openings?: OpeningsManager;
};

export type HouseGroupUserData = {
  systemId: string;
  houseId: string;
  houseTypeId: string;
  friendlyName: string;
};

export class HouseGroup extends Group {
  userData: HouseGroupUserData;
  hooks: Partial<Hooks>;
  managers: Managers;
  rotateHandlesGroup: RotateHandlesGroup;

  constructor({
    userData,
    initialColumnLayoutGroup,
    hooks,
    position = { x: 0, y: 0, z: 0 },
    rotation = 0,
    managers = {},
  }: {
    userData: HouseGroupUserData;
    initialColumnLayoutGroup: ColumnLayoutGroup;
    hooks?: Partial<Hooks>;
    position?: { x: number; y: number; z: number };
    rotation?: number;
    managers?: Partial<Managers>;
  }) {
    super();
    this.userData = userData;

    this.add(initialColumnLayoutGroup);

    this.managers = {
      elements: managers.elements ?? new ElementsManager(this),
      layouts: managers.layouts ?? new LayoutsManager(this),
      xStretch: managers.xStretch ?? new XStretchManager(this),
      zStretch: managers.zStretch ?? new ZStretchManager(this),
      cuts: managers.cuts ?? new CutsManager(this),
      openings: managers.openings ?? new OpeningsManager(this),
    };

    this.managers.layouts.activeLayoutGroup = initialColumnLayoutGroup;
    this.hooks = hooks ?? {};

    this.position.set(position.x, position.y, position.z);
    this.rotation.setFromVector3(new Vector3(0, rotation, 0));

    this.rotateHandlesGroup = new RotateHandlesGroup(
      initialColumnLayoutGroup.obb
    );
    // this.rotateHandlesGroup.syncDimensions();
    this.hideRotateHandles();
  }

  get friendlyName(): string {
    return this.userData.friendlyName;
  }

  set friendlyName(friendlyName: string) {
    this.userData.friendlyName = friendlyName;
    this.hooks?.onHouseUpdate?.(this.house.houseId, { friendlyName });
  }

  get activeLayoutGroup(): O.Option<ColumnLayoutGroup> {
    return pipe(
      this.managers.layouts,
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
    this.hooks?.onHouseDelete?.(this.house.houseId);
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

  editHouse() {
    if (this.scene.contextManager) {
      this.scene.contextManager.buildingHouseGroup = O.some(this);
    }
  }

  showRotateHandles() {
    console.log("showRotateHandles");
    showObject(this.rotateHandlesGroup);
  }

  hideRotateHandles() {
    hideObject(this.rotateHandlesGroup);
  }
}

export type { Hooks as HouseGroupHooks, Managers as HouseGroupManagers };
