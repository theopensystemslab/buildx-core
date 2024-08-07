import { A } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { HouseGroup } from "../objects/house/HouseGroup";

class CollisionManager {
  private houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
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

  computeNearNeighbours(): HouseGroup[] {
    const scene = this.houseGroup.scene;
    const thisAABB = this.houseGroup.unsafeAABB;

    return pipe(
      scene.houses,
      A.filter((x) => {
        return x.unsafeAABB.intersectsBox(thisAABB);
      })
    );
  }

  checkCollisions(neighbours: HouseGroup[]): boolean {
    const thisOBB = this.houseGroup.unsafeOBB;

    for (const neighbour of neighbours) {
      if (neighbour.unsafeOBB.intersectsOBB(thisOBB)) {
        return true;
      }
    }

    return false;
  }

  computeLengthWiseNeighbours(): HouseGroup[] {
    const scene = this.houseGroup.scene;

    const thisOBB = this.houseGroup.unsafeOBB;

    return pipe(
      scene.houses,
      A.filter((houseGroup) => {
        const obb = houseGroup.unsafeOBB.clone();
        obb.halfSize.setZ(999);

        if (obb.intersectsOBB(thisOBB)) {
          return true;
        }

        return false;
      })
    );
  }
}

export default CollisionManager;
