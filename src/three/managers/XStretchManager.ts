import { SectionType } from "@/build-systems/remote/sectionTypes";
import { A, O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import StretchHandleGroup from "../objects/handles/StretchHandleGroup";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { setVisibilityDown } from "../utils";
import { ModeEnum } from "./ModeManager";
import StretchManager from "./StretchManager";

class XStretchManager implements StretchManager {
  houseGroup: HouseGroup;
  handles: [StretchHandleGroup, StretchHandleGroup];
  initData?: {
    alts: Array<{ sectionType: SectionType; layoutGroup: ColumnLayoutGroup }>;
    minWidth: number;
    maxWidth: number;
    initialLayoutWidth: number;
  };
  startData?: {
    side: 1 | -1;
  };
  progressData?: {
    cumulativeDx: number;
    currentLayoutIndex: number;
  };

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;

    this.handles = [
      new StretchHandleGroup({
        axis: "x",
        side: -1,
        houseGroup,
      }),
      new StretchHandleGroup({
        axis: "x",
        side: 1,
        houseGroup,
      }),
    ];
    this.init();
    setTimeout(() => this.init(), 2000);
  }

  async init() {
    const activeLayoutGroup = this.houseGroup.activeLayoutGroup;

    const [handleDown, handleUp] = this.handles;
    this.houseGroup.add(handleDown);
    this.houseGroup.add(handleUp);

    if (this.houseGroup.modeManager.mode === ModeEnum.Enum.SITE) {
      this.hideHandles();
    }

    const alts =
      await this.houseGroup.layoutsManager.prepareAltSectionTypeLayouts();

    const currentLayoutIndex = alts.findIndex(
      (x) => x.layoutGroup === activeLayoutGroup
    );
    if (currentLayoutIndex === -1) throw new Error(`currentLayoutIndex === -1`);

    this.initData = {
      alts,
      minWidth: alts[0].sectionType.width,
      maxWidth: alts[alts.length - 1].sectionType.width,
      initialLayoutWidth: activeLayoutGroup.userData.width,
    };

    this.progressData = {
      cumulativeDx: 0,
      currentLayoutIndex,
    };
  }

  gestureStart(side: 1 | -1) {
    this.startData = {
      side,
    };
  }
  gestureProgress(delta: number) {
    const { initialLayoutWidth: currentWidth, alts } = this.initData!;
    const { side } = this.startData!;

    this.progressData!.cumulativeDx += delta;

    const { cumulativeDx, currentLayoutIndex } = this.progressData!;

    // up the axis
    if (side === 1) {
      // additive up the axis
      if (delta > 0) {
        pipe(
          alts,
          A.lookup(currentLayoutIndex + 1),
          O.map((nextWiderLayout) => {
            const v = currentWidth + cumulativeDx;
            const targetWidth = nextWiderLayout.sectionType.width;

            if (v >= targetWidth) {
              console.log("swap up");
              this.houseGroup.layoutsManager.activeLayoutGroup =
                nextWiderLayout.layoutGroup;
              this.progressData!.currentLayoutIndex++;
            }
          })
        );
      }

      // subtractive down the axis
      if (delta < 0) {
        pipe(
          alts,
          A.lookup(currentLayoutIndex - 1),
          O.map((nextShorterLayout) => {
            const v = currentWidth + cumulativeDx;
            const targetWidth = nextShorterLayout.sectionType.width;

            if (v <= targetWidth) {
              console.log(`swap down`);

              this.houseGroup.layoutsManager.activeLayoutGroup =
                nextShorterLayout.layoutGroup;
              this.progressData!.currentLayoutIndex--;
            }
          })
        );
      }
    }

    // down the axis
    if (side === -1) {
      // additive down the axis
      if (delta < 0) {
      }

      // subtractive up the axis
      if (delta > 0) {
      }
    }

    // this.progressData!.currentWidth = ;

    const [handleDown, handleUp] = this.handles;

    handleDown.position.x -= side * delta;
    handleUp.position.x += side * delta;
  }
  gestureEnd() {
    this.houseGroup.zStretchManager.init();
  }

  showHandles() {
    this.handles.forEach((handle) => {
      setVisibilityDown(handle, true);
    });
  }

  hideHandles() {
    this.handles.forEach((handle) => {
      setVisibilityDown(handle, false);
    });
  }
}

export default XStretchManager;
