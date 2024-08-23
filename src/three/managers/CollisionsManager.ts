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

  checkCollisions(neighbours: HouseGroup[] = this.nearNeighbours): boolean {
    const thisOBB = this.houseGroup.unsafeOBB;

    for (const neighbour of neighbours) {
      if (neighbour.unsafeOBB.intersectsOBB(thisOBB)) {
        return true;
      }
    }

    return false;
  }

  computeLengthWiseNeighbours(): HouseGroup[] {
    const thisOBB = this.houseGroup.unsafeOBB;

    return pipe(
      this.houseGroup.scene.houses,
      A.filter((houseGroup) => {
        if (houseGroup.uuid === this.houseGroup.uuid) return false;

        const obb = houseGroup.unsafeOBB.clone();
        obb.halfSize.setZ(999);

        return obb.intersectsOBB(thisOBB);
      })
    );
  }
}

export default CollisionManager;
