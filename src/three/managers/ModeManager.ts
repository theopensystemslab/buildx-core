import { z } from "zod";
import { HouseGroup } from "../objects/house/HouseGroup";

export const ModeEnum = z.enum(["SITE", "BUILDING", "LEVEL"]);

export type ModeEnum = z.infer<typeof ModeEnum>;

class ModeManager {
  houseGroup: HouseGroup;
  mode: ModeEnum;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.mode = ModeEnum.Enum.SITE;
    // this.init();
  }

  init() {
    // check everything per this.mode
  }

  setMode(v: ModeEnum) {
    switch (true) {
      // (down) Site -> Building
      case this.mode === ModeEnum.Enum.SITE && v === ModeEnum.Enum.BUILDING: {
        this.houseGroup.zStretchManager.init();
        this.houseGroup.zStretchManager.showHandles();
        this.houseGroup.xStretchManager?.showHandles();
        break;
      }
      // (down) Building -> Level
      case this.mode === ModeEnum.Enum.BUILDING && v === ModeEnum.Enum.LEVEL: {
        this.houseGroup.cutsManager.setClippingBrush({
          rowIndex: 1,
          x: false,
          z: false,
        });
        this.houseGroup.cutsManager.syncObjectCuts(
          this.houseGroup.activeLayoutGroup
        );
        break;
      }
      // (up) Builing -> Site
      case this.mode === ModeEnum.Enum.BUILDING && v === ModeEnum.Enum.SITE: {
        this.houseGroup.zStretchManager.hideHandles();
        this.houseGroup.xStretchManager?.hideHandles();
        break;
      }
      // (up) Level -> Building
      case this.mode === ModeEnum.Enum.LEVEL && v === ModeEnum.Enum.BUILDING: {
        this.houseGroup.cutsManager.setClippingBrush({
          ...this.houseGroup.cutsManager.settings,
          rowIndex: null,
        });
        this.houseGroup.cutsManager.syncObjectCuts(
          this.houseGroup.activeLayoutGroup
        );
        break;
      }
      // (up, up) Level -> Site
      case this.mode === ModeEnum.Enum.LEVEL && v === ModeEnum.Enum.SITE: {
        this.houseGroup.zStretchManager.hideHandles();
        this.houseGroup.cutsManager.setClippingBrush({
          ...this.houseGroup.cutsManager.settings,
          rowIndex: null,
        });
        break;
      }
      default: {
        throw new Error(`unexpected mode shift from ${this.mode} to ${v}`);
      }
    }

    this.mode = v;
  }

  down() {
    if (this.mode === ModeEnum.Enum.SITE) {
      this.setMode(ModeEnum.Enum.BUILDING);
    } else if (this.mode === ModeEnum.Enum.BUILDING) {
      this.setMode(ModeEnum.Enum.LEVEL);
    }
  }

  up() {
    if (this.mode === ModeEnum.Enum.LEVEL) {
      this.setMode(ModeEnum.Enum.BUILDING);
    } else if (this.mode === ModeEnum.Enum.BUILDING) {
      this.setMode(ModeEnum.Enum.SITE);
    }
  }
}

export default ModeManager;
