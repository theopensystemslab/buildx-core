import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
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
        this.houseGroup.zStretchManager?.init();
        this.houseGroup.zStretchManager?.showHandles();
        this.houseGroup.xStretchManager?.init();
        this.houseGroup.xStretchManager?.showHandles();
        break;
      }
      // (down) Building -> Level
      case this.mode === ModeEnum.Enum.BUILDING && v === ModeEnum.Enum.LEVEL: {
        const { cutsManager, activeLayoutGroup, xStretchManager } =
          this.houseGroup;
        pipe(
          activeLayoutGroup,
          O.map((activeLayoutGroup) => {
            cutsManager?.setClippingBrush({
              ...cutsManager.settings,
              rowIndex: 1,
            });
            cutsManager?.createObjectCuts(activeLayoutGroup);
            cutsManager?.showClippedBrushes(activeLayoutGroup);

            xStretchManager?.initData?.alts?.forEach(({ layoutGroup }) => {
              if (layoutGroup === activeLayoutGroup) return;
              cutsManager?.createObjectCuts(layoutGroup);
            });
          })
        );
        // xStretchManager.initData?.alts.forEach(({ layoutGroup }) => {
        //   if (layoutGroup !== activeLayoutGroup) {
        //     cutsManager.createObjectCuts(layoutGroup);
        //     cutsManager.showClippedBrushes(layoutGroup);
        //   }
        // });
        break;
      }
      // (up) Builing -> Site
      case this.mode === ModeEnum.Enum.BUILDING && v === ModeEnum.Enum.SITE: {
        this.houseGroup.zStretchManager?.hideHandles();
        this.houseGroup.xStretchManager?.hideHandles();
        break;
      }
      // (up) Level -> Building
      case this.mode === ModeEnum.Enum.LEVEL && v === ModeEnum.Enum.BUILDING: {
        pipe(
          this.houseGroup.activeLayoutGroup,
          O.map((activeLayoutGroup) => {
            this.houseGroup.cutsManager?.setClippingBrush({
              ...this.houseGroup.cutsManager.settings,
              rowIndex: null,
            });
            this.houseGroup.cutsManager?.createObjectCuts(activeLayoutGroup);
            this.houseGroup.cutsManager?.showAppropriateBrushes(
              activeLayoutGroup
            );
          })
        );
        break;
      }
      // (up, up) Level -> Site
      case this.mode === ModeEnum.Enum.LEVEL && v === ModeEnum.Enum.SITE: {
        // this.houseGroup.zStretchManager.hideHandles();
        // this.houseGroup.cutsManager.setClippingBrush({
        //   ...this.houseGroup.cutsManager.settings,
        //   rowIndex: null,
        // });
        // this.houseGroup.cutsManager.syncObjectCuts(this.houseGroup);
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
