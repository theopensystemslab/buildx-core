import { HouseGroup } from "@/index";
import { createHandleMaterial } from "@/three/objects/handles/handleMaterial";
import StretchHandleMesh, {
  DEFAULT_HANDLE_SIZE,
} from "@/three/objects/handles/StretchHandleMesh";
import { hideObject, showObject } from "@/three/utils/layers";
import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { AbstractXStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import { MeshStandardMaterial } from "three";

class MovingHandlesManager extends AbstractXStretchManager {
  private handleMaterial: MeshStandardMaterial;
  handles?: [StretchHandleMesh, StretchHandleMesh];

  initData?: {
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
  };

  startData?: {
    side: 1 | -1;
  };

  progressData?: {
    cumulativeDx: number;
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
    const activeLayoutGroup = this.houseGroup.unsafeActiveLayoutGroup;
    const { width, depth } = activeLayoutGroup.userData;

    const handle0 = new StretchHandleMesh({
      depth,
      manager: this,
      material: this.handleMaterial,
      axis: "x",
      side: -1,
    });
    handle0.position.x = -width / 2 - DEFAULT_HANDLE_SIZE;

    const handle1 = new StretchHandleMesh({
      depth,
      manager: this,
      material: this.handleMaterial,
      axis: "x",
      side: 1,
    });
    handle1.position.x = width / 2 + DEFAULT_HANDLE_SIZE;

    this.handles = [handle0, handle1];
    this.houseGroup.add(handle0);
    this.houseGroup.add(handle1);
  }

  init() {
    this.cleanup();

    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        this.createHandles();

        // For now, just set some basic width constraints
        this.initData = {
          initialWidth: activeLayoutGroup.userData.width,
          minWidth: activeLayoutGroup.userData.width * 0.5,
          maxWidth: activeLayoutGroup.userData.width * 1.5,
        };

        this.progressData = {
          cumulativeDx: 0,
        };
      })
    );
  }

  gestureStart(side: 1 | -1) {
    this.startData = { side };
    this.houseGroup.managers.zStretch?.hideHandles();
  }

  gestureProgress(delta: number) {
    if (!this.initData || !this.startData || !this.progressData) {
      console.error("Gesture progress called before initialization");
      return;
    }

    const { initialWidth, minWidth, maxWidth } = this.initData;
    const { side } = this.startData;

    // Calculate target width directly from cumulative delta
    const targetWidth =
      initialWidth + this.progressData.cumulativeDx + side * delta;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, targetWidth));

    // Update cumulative delta
    this.progressData.cumulativeDx = newWidth - initialWidth;

    // Update handle positions based on the width change
    const widthDelta = newWidth - initialWidth;
    this.updateHandlePositions(widthDelta);
  }

  private updateHandlePositions(delta: number) {
    if (this.handles?.length !== 2) {
      return;
    }

    const halfDelta = delta / 2;
    const [handleDown, handleUp] = this.handles;

    // Move both handles symmetrically from their initial positions
    handleDown.position.x =
      -this.initData!.initialWidth / 2 - DEFAULT_HANDLE_SIZE - halfDelta;
    handleUp.position.x =
      this.initData!.initialWidth / 2 + DEFAULT_HANDLE_SIZE + halfDelta;
  }

  gestureEnd() {
    this.houseGroup.managers.zStretch?.showHandles();
  }

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
    this.progressData = undefined;
  }
}

export default MovingHandlesManager;
