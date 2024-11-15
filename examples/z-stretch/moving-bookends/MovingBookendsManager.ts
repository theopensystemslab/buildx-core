import { HouseGroup } from "@/index";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import { ColumnGroup } from "@/three/objects/house/ColumnGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { AbstractZStretchManager } from "@/three/managers/AbstractStretchManagers";

class MovingBookendsManager extends AbstractZStretchManager {
  houseGroup: HouseGroup;

  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    startColumnGroup: ColumnGroup;
    endColumnGroup: ColumnGroup;
    midColumnGroups: ColumnGroup[];
  };

  startData?: {
    side: 1 | -1;
  };

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);
    this.houseGroup = houseGroup;
    this.handles = [
      new StretchHandleGroup({ axis: "z", side: -1, manager: this }),
      new StretchHandleGroup({ axis: "z", side: 1, manager: this }),
    ];
  }

  init() {
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const { startColumnGroup, midColumnGroups, endColumnGroup } =
          activeLayoutGroup.getPartitionedColumnGroups();

        this.initData = {
          startColumnGroup,
          midColumnGroups,
          endColumnGroup,
        };

        this.handles.forEach((x) => {
          x.syncDimensions(activeLayoutGroup);
        });
        const [handleDown, handleUp] = this.handles;
        endColumnGroup.add(handleUp);
        startColumnGroup.add(handleDown);
      })
    );
  }

  gestureStart(side: 1 | -1) {
    this.startData = {
      side,
    };
  }

  gestureProgress(delta: number) {
    const { side } = this.startData!;

    const { startColumnGroup, endColumnGroup } = this.initData!;

    const bookendColumn = side === 1 ? endColumnGroup : startColumnGroup;

    bookendColumn.position.z += delta;
  }

  gestureEnd() {}

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  cleanup(): void {}
}

export default MovingBookendsManager;
