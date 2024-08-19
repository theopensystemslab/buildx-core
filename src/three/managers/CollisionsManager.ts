import { A } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { HouseGroup } from "../objects/house/HouseGroup";

class CollisionManager {
  private houseGroup: HouseGroup;
  nearNeighbours: HouseGroup[] = [];

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  updateNearNeighbours(): void {
    const scene = this.houseGroup.scene;
    const thisAABB = this.houseGroup.unsafeAABB;

    this.nearNeighbours = pipe(
      scene.houses,
      A.filter(
        (x) => x !== this.houseGroup && x.unsafeAABB.intersectsBox(thisAABB)
      )
    );
  }

  checkCollisions(): boolean {
    const thisOBB = this.houseGroup.unsafeOBB;

    for (const neighbour of this.nearNeighbours) {
      if (neighbour.unsafeOBB.intersectsOBB(thisOBB)) {
        return true;
      }
    }

    return false;
  }

  computeLengthWiseNeighbours(): HouseGroup[] {
    const thisOBB = this.houseGroup.unsafeOBB;

    return pipe(
      this.nearNeighbours,
      A.filter((houseGroup) => {
        const obb = houseGroup.unsafeOBB.clone();
        obb.halfSize.setZ(999);

        return obb.intersectsOBB(thisOBB);
      })
    );
  }
}

export default CollisionManager;
