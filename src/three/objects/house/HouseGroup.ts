import { House } from "@/data/user/houses";
import CollisionsManager from "@/three/managers/CollisionsManager";
import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import LayoutsManager from "@/three/managers/LayoutsManager";
import LevelTypesManager from "@/three/managers/LevelTypesManager";
import MoveManager from "@/three/managers/MoveManager";
import OpeningsManager from "@/three/managers/OpeningsManager";
import RotateManager from "@/three/managers/RotateManager";
import ZStretchManager from "@/three/managers/stretch/ZStretchManager";
import { findFirstGuardUp } from "@/three/utils/sceneQueries";
import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Box3, Group, Vector3 } from "three";
import { OBB } from "three-stdlib";
import BuildXScene from "../scene/BuildXScene";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { ElementBrush, ElementGroup } from "./ElementGroup";
import {
  AbstractXStretchManager,
  AbstractZStretchManager,
} from "@/three/managers/stretch/AbstractStretchManagers";
import XStretchManager from "@/three/managers/stretch/XStretchManager";

type Hooks = {
  onHouseCreate: (house: House) => void;
  onHouseUpdate: (houseId: string, changes: Partial<House>) => void;
  onHouseDelete: (houseId: string) => void;
};

type Managers = {
  layouts: LayoutsManager;
  move?: MoveManager;
  rotate?: RotateManager;
  elements?: ElementsManager;
  xStretch?: AbstractXStretchManager;
  zStretch?: AbstractZStretchManager;
  cuts?: CutsManager;
  openings?: OpeningsManager;
  collisions?: CollisionsManager;
  levelTypes?: LevelTypesManager;
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
  private elementBrushes: Map<string, ElementBrush[]> = new Map();

  constructor({
    userData,
    initialColumnLayoutGroup,
    hooks,
    position = { x: 0, y: 0, z: 0 },
    rotation = 0,
    managers = {},
    activeElementMaterials = {},
  }: {
    userData: HouseGroupUserData;
    initialColumnLayoutGroup: ColumnLayoutGroup;
    hooks?: Partial<Hooks>;
    position?: { x: number; y: number; z: number };
    rotation?: number;
    managers?: Partial<Managers>;
    activeElementMaterials?: Record<string, string>;
  }) {
    super();
    this.userData = userData;

    this.add(initialColumnLayoutGroup);

    this.managers = {
      elements:
        managers.elements ?? new ElementsManager(this, activeElementMaterials),
      move: managers.move ?? new MoveManager(this),
      rotate: managers.rotate ?? new RotateManager(this),
      layouts: managers.layouts ?? new LayoutsManager(this),
      xStretch: managers.xStretch ?? new XStretchManager(this),
      zStretch: managers.zStretch ?? new ZStretchManager(this),
      cuts: managers.cuts ?? new CutsManager(this),
      openings: managers.openings ?? new OpeningsManager(this),
      collisions: managers.collisions ?? new CollisionsManager(this),
      levelTypes: managers.levelTypes ?? new LevelTypesManager(this),
    };
    this.managers.layouts.activeLayoutGroup = initialColumnLayoutGroup;
    this.managers.layouts.prepareHouseTypeLayoutGroup();
    this.hooks = hooks ?? {};

    this.position.set(position.x, position.y, position.z);
    this.rotation.setFromVector3(new Vector3(0, rotation, 0));

    this.updateBBs();
    this.updateElementBrushes();
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

  get unsafeActiveLayoutGroup(): ColumnLayoutGroup {
    const activeLayoutGroup = this.activeLayoutGroup;
    if (activeLayoutGroup._tag === "Some") {
      return activeLayoutGroup.value;
    } else {
      throw new Error(`no activeLayoutGroup in houseGroup`);
    }
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

  renderOBB() {
    const activeLayoutGroup = this.activeLayoutGroup;
    if (activeLayoutGroup._tag === "Some") {
      activeLayoutGroup.value.renderOBB();
    } else {
      throw new Error(`no activeLayoutGroup in houseGroup`);
    }
  }

  get scene(): BuildXScene | null {
    return pipe(
      this,
      findFirstGuardUp((o): o is BuildXScene => o instanceof BuildXScene),
      O.toNullable
    );
  }

  get house(): House {
    const {
      userData: { systemId, houseId, friendlyName, houseTypeId },
      position,
      rotation: { y: rotation },
      activeLayoutGroup,
      managers: { elements },
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
            activeElementMaterials: elements?.overrides ?? {},
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
    if (this.scene?.contextManager) {
      this.scene.contextManager.buildingHouseGroup = O.some(this);
    }
  }

  updateElementBrushes() {
    this.elementBrushes.clear();
    this.traverse((object) => {
      if (object instanceof ElementGroup) {
        const {
          element: { ifcTag },
        } = object.userData;
        pipe(
          object.getVisibleBrush(),
          O.map((brush) => {
            if (!this.elementBrushes.has(ifcTag)) {
              this.elementBrushes.set(ifcTag, [brush]);
            } else {
              this.elementBrushes.get(ifcTag)!.push(brush);
            }
          })
        );
      }
    });
  }

  getElementBrushes(ifcTag: string): ElementBrush[] {
    return this.elementBrushes.get(ifcTag) ?? [];
  }

  getAllVisibleBrushes(): ElementBrush[] {
    return Array.from(this.elementBrushes.values()).flat();
  }

  updateDB() {
    this.hooks?.onHouseUpdate?.(this.house.houseId, {
      dnas: this.unsafeActiveLayoutGroup.userData.dnas,
      position: this.position,
      rotation: this.rotation.y,
      activeElementMaterials: this.managers.elements?.overrides ?? {},
      friendlyName: this.friendlyName,
    });
  }

  dispose() {
    this.scene?.gestureManager?.removeGestureEnabledObject(this);
    this.removeFromParent();
  }
}

export type { Hooks as HouseGroupHooks, Managers as HouseGroupManagers };
