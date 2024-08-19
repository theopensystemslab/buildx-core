import { Vector3 } from "three";
import { HouseGroup } from "../objects/house/HouseGroup";
import { AABB_OFFSET } from "../objects/house/ColumnLayoutGroup";

const MOVEMENT_THRESHOLD = AABB_OFFSET / 2;

class MoveManager {
  private houseGroup: HouseGroup;
  private movementSinceLastUpdate: Vector3;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.movementSinceLastUpdate = new Vector3();
  }

  gestureStart() {
    this.houseGroup.managers.collisions?.updateNearNeighbours();
    this.movementSinceLastUpdate.set(0, 0, 0);
  }

  gestureProgress(v: Vector3) {
    this.houseGroup.unsafeOBB.center.add(v);

    if (this.houseGroup.managers.collisions?.checkCollisions()) {
      this.houseGroup.unsafeOBB.center.sub(v);
      return;
    }

    this.houseGroup.position.add(v);
    this.houseGroup.updateBBs();
    this.movementSinceLastUpdate.add(v);

    if (this.movementSinceLastUpdate.length() > MOVEMENT_THRESHOLD) {
      this.houseGroup.managers.collisions?.updateNearNeighbours();
      this.movementSinceLastUpdate.set(0, 0, 0);
    }
  }

  persistPosition(): void {
    const { position } = this.houseGroup;

    this.houseGroup.hooks?.onHouseUpdate?.(this.houseGroup.userData.houseId, {
      position,
    });
  }
}

export default MoveManager;
