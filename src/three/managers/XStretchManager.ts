import StretchHandleGroup from "../objects/handles/StretchHandleGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { setVisibilityDown } from "../utils";
import { ModeEnum } from "./ModeManager";
import StretchManager from "./StretchManager";

class XStretchManager implements StretchManager {
  houseGroup: HouseGroup;
  handles: [StretchHandleGroup, StretchHandleGroup];

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

    // alt widths
    const foo =
      await this.houseGroup.layoutsManager.prepareAltSectionTypeLayouts();
    console.log({ foo });
  }

  gestureStart(_side: 1 | -1) {}
  gestureProgress(_delta: number) {}
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
