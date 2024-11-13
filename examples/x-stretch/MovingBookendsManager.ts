import { HouseGroup } from "@/index";
import StretchManager from "@/three/managers/StretchManager";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";

class MovingBookendsManager implements StretchManager {
  houseGroup: HouseGroup;
  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
  };

  startData?: {
    side: 1 | -1;
  };

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.handles = [
      new StretchHandleGroup({ axis: "x", side: -1, manager: this }),
      new StretchHandleGroup({ axis: "x", side: 1, manager: this }),
    ];
  }

  init() {
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        this.handles.forEach((x) => x.syncDimensions(activeLayoutGroup));

        const [handleLeft, handleRight] = this.handles;
        this.houseGroup.add(handleLeft);
        this.houseGroup.add(handleRight);

        // For now, just set some basic width constraints
        this.initData = {
          initialWidth: activeLayoutGroup.userData.width,
          minWidth: activeLayoutGroup.userData.width * 0.5,
          maxWidth: activeLayoutGroup.userData.width * 1.5,
        };
      })
    );
  }

  gestureStart(side: 1 | -1) {
    this.startData = { side };
    this.houseGroup.managers.zStretch?.hideHandles();
  }

  gestureProgress(delta: number) {
    if (!this.initData || !this.startData) return;

    const { initialWidth, minWidth, maxWidth } = this.initData;
    const { side } = this.startData;

    // Calculate potential new width
    const halfDelta = delta / 2;
    const [handleLeft, handleRight] = this.handles;

    // Move handles symmetrically
    handleLeft.position.x -= halfDelta;
    handleRight.position.x += halfDelta;

    // Update layout width (this will be expanded in future versions)
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth, initialWidth + side * delta)
        );
        activeLayoutGroup.scale.x = newWidth / initialWidth;
      })
    );
  }

  gestureEnd() {
    this.houseGroup.managers.zStretch?.showHandles();
  }

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }
}

export default MovingBookendsManager;
