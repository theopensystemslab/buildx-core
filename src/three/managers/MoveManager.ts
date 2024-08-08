import { Vector3 } from "three";
import { HouseGroup } from "../objects/house/HouseGroup";

class MoveManager {
  private houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  gestureStart() {
    this.houseGroup.managers.collisions?.updateNearNeighbours();
  }

  gestureProgress(v: Vector3) {
    this.houseGroup.unsafeOBB.center.add(v);
    if (this.houseGroup.managers.collisions?.checkCollisions()) {
      this.houseGroup.unsafeOBB.center.sub(v);
      return;
    }
    this.houseGroup.position.add(v);
  }

  updateTransforms(): void {
    const {
      position,
      rotation: { y: rotation },
    } = this.houseGroup;
    this.houseGroup.hooks?.onHouseUpdate?.(this.houseGroup.userData.houseId, {
      position,
      rotation,
    });
    this.houseGroup.updateBBs();
  }
}

export default MoveManager;
