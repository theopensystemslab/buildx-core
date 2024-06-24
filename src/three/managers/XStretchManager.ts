import { SectionType } from "@/build-systems/remote/sectionTypes";
import StretchHandleGroup from "../objects/handles/StretchHandleGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { setVisibilityDown } from "../utils";
import { ModeEnum } from "./ModeManager";
import StretchManager from "./StretchManager";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";

class XStretchManager implements StretchManager {
  houseGroup: HouseGroup;
  handles: [StretchHandleGroup, StretchHandleGroup];
  initData?: {
    alts: Array<{ sectionType: SectionType; layoutGroup: ColumnLayoutGroup }>;
    currentLayoutWidth: number;
  };
  startData?: {
    side: 1 | -1;
  };
  progressData?: {
    currentWidth: number;
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
    activeLayoutGroup.add(handleDown);
    activeLayoutGroup.add(handleUp);

    if (this.houseGroup.modeManager.mode === ModeEnum.Enum.SITE) {
      this.hideHandles();
    }

    this.initData = {
      alts: await this.houseGroup.layoutsManager.prepareAltSectionTypeLayouts(),
      currentLayoutWidth: activeLayoutGroup.userData.width,
    };

    this.progressData = {
      currentWidth: this.initData.currentLayoutWidth,
    };
  }

  gestureStart(side: 1 | -1) {
    this.startData = {
      side,
    };
  }
  gestureProgress(delta: number) {
    const { side } = this.startData!;

    this.progressData!.currentWidth += side * delta;
    const [handleDown, handleUp] = this.handles;
    handleDown.position.x -= side * delta;
    handleUp.position.x += side * delta;
  }
  gestureEnd() {}

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
