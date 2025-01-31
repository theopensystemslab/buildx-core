import { HouseGroup } from "@/index";
import { AbstractZStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import { createHandleMaterial } from "@/three/objects/handles/handleMaterial";
import StretchHandleMesh, {
  DEFAULT_HANDLE_SIZE,
} from "@/three/objects/handles/StretchHandleMesh";
import { ColumnGroup } from "@/three/objects/house/ColumnGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { MeshStandardMaterial } from "three";

class MovingBookendsManager extends AbstractZStretchManager {
  private handleMaterial: MeshStandardMaterial;
  handles?: [StretchHandleMesh, StretchHandleMesh];

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
    this.handleMaterial = createHandleMaterial();
  }

  clearHandles() {
    this.handles?.forEach((handle) => {
      handle.removeFromParent();
    });
    this.handles = undefined;
  }

  createHandles() {
    if (!this.initData) return;

    const { startColumnGroup, endColumnGroup } = this.initData;
    const { width } = this.houseGroup.unsafeActiveLayoutGroup.userData;

    const handle0 = new StretchHandleMesh({
      width,
      manager: this,
      material: this.handleMaterial,
      axis: "z",
      side: -1,
    });
    handle0.position.z = -DEFAULT_HANDLE_SIZE;
    startColumnGroup.add(handle0);

    const handle1 = new StretchHandleMesh({
      width,
      manager: this,
      material: this.handleMaterial,
      axis: "z",
      side: 1,
    });
    handle1.position.z = DEFAULT_HANDLE_SIZE + endColumnGroup.userData.depth;
    endColumnGroup.add(handle1);

    this.handles = [handle0, handle1];
  }

  init() {
    this.cleanup();

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

        this.createHandles();
      })
    );
  }

  gestureStart(side: 1 | -1) {
    this.startData = {
      side,
    };
  }

  gestureProgress(delta: number) {
    if (!this.startData || !this.initData) return;

    const { side } = this.startData;
    const { startColumnGroup, endColumnGroup } = this.initData;

    const bookendColumn = side === 1 ? endColumnGroup : startColumnGroup;
    bookendColumn.position.z += delta;
  }

  gestureEnd() {}

  showHandles() {
    this.handles?.forEach(showObject);
  }

  hideHandles() {
    this.handles?.forEach(hideObject);
  }

  cleanup(): void {
    this.clearHandles();
    this.initData = undefined;
    this.startData = undefined;
  }
}

export default MovingBookendsManager;
