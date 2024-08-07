import { House } from "@/data/user/houses";
import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import OpeningsManager from "@/three/managers/OpeningsManager";
import RotateManager from "@/three/managers/RotateManager";
import XStretchManager from "@/three/managers/XStretchManager";
import ZStretchManager from "@/three/managers/ZStretchManager";
import { findFirstGuardUp } from "@/three/utils/sceneQueries";
import { O, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Box3, Group, Vector3 } from "three";
import { OBB } from "three-stdlib";
import BuildXScene from "../scene/BuildXScene";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import CollisionsManager from "@/three/managers/CollisionsManager";

type Hooks = {
  onHouseCreate: (house: House) => void;
  onHouseUpdate: (houseId: string, changes: Partial<House>) => void;
  onHouseDelete: (houseId: string) => void;
};

type Managers = {
  layouts: LayoutsManager;
  rotate?: RotateManager;
  elements?: ElementsManager;
  xStretch?: XStretchManager;
  zStretch?: ZStretchManager;
  cuts?: CutsManager;
  openings?: OpeningsManager;
  collisions?: CollisionsManager;
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
      rotate: managers.rotate ?? new RotateManager(this),
      layouts: managers.layouts ?? new LayoutsManager(this),
      xStretch: managers.xStretch ?? new XStretchManager(this),
      zStretch: managers.zStretch ?? new ZStretchManager(this),
      cuts: managers.cuts ?? new CutsManager(this),
      openings: managers.openings ?? new OpeningsManager(this),
      collisions: managers.collisions ?? new CollisionsManager(this),
    };
    this.managers.layouts.activeLayoutGroup = initialColumnLayoutGroup;
    this.hooks = hooks ?? {};

    this.position.set(position.x, position.y, position.z);
    this.rotation.setFromVector3(new Vector3(0, rotation, 0));

    this.updateBBs();
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

  get unsafeOBB(): OBB {
    const activeLayoutGroup = this.activeLayoutGroup;
    if (activeLayoutGroup._tag === "Some") {
      return activeLayoutGroup.value.obb;
    } else {
      throw new Error(`no activeLayoutGroup in houseGroup`);
    }
  }

  get unsafeAABB(): Box3 {
    const activeLayoutGroup = this.activeLayoutGroup;
    if (activeLayoutGroup._tag === "Some") {
      return activeLayoutGroup.value.aabb;
    } else {
      throw new Error(`no activeLayoutGroup in houseGroup`);
    }
  }

  updateBBs() {
    pipe(
      this.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        activeLayoutGroup.updateBBs();
      })
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
}

export type { Hooks as HouseGroupHooks, Managers as HouseGroupManagers };
