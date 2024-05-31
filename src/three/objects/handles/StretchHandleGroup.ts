import { A } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { BoxGeometry, SphereGeometry } from "three";
import { HouseGroup } from "../house/HouseGroup";
import HandleGroup from "./HandleGroup";
import HandleMesh from "./HandleMesh";
import handleMaterial from "./handleMaterial";

type StretchAxis = "x" | "z";
type StretchSide = 1 | -1;

const sphereGeom = new SphereGeometry(0.5);
const boxGeom = new BoxGeometry(1, 1, 1);

const OFFSET = 0.5;

class StretchHandleGroup extends HandleGroup {
  userData: {
    axis: StretchAxis;
    side: StretchSide;
  };
  houseGroup: HouseGroup;
  boxMesh: HandleMesh;
  sphereMeshes: [HandleMesh, HandleMesh];

  constructor({
    axis,
    side,
    houseGroup,
  }: {
    axis: StretchAxis;
    side: StretchSide;
    houseGroup: HouseGroup;
  }) {
    super();
    this.houseGroup = houseGroup;
    this.userData = {
      axis,
      side,
    };
    this.boxMesh = this.createBoxMesh();
    this.sphereMeshes = this.createSphereMeshes();
    this.add(this.boxMesh, ...this.sphereMeshes);
    this.syncDimensions();
  }

  private createBoxMesh(): HandleMesh {
    const boxMesh = new HandleMesh(boxGeom, handleMaterial);
    boxMesh.scale.setY(0.001);
    return boxMesh;
  }

  private createSphereMeshes(): [HandleMesh, HandleMesh] {
    return pipe(
      A.replicate(2, sphereGeom),
      A.map((geom): HandleMesh => {
        const mesh = new HandleMesh(geom, handleMaterial);
        mesh.scale.setY(0.001);
        return mesh;
      })
    ) as [HandleMesh, HandleMesh];
  }

  syncDimensions() {
    const {
      userData: { axis, side },
      houseGroup: {
        activeLayoutGroup: {
          userData: { depth, width },
        },
      },
      boxMesh,
      sphereMeshes,
    } = this;

    switch (axis) {
      case "x":
        boxMesh.scale.setZ(depth);
        sphereMeshes.forEach((sphereMesh, i) => {
          const sign = i === 0 ? 1 : -1;
          sphereMesh.position.setZ((depth / 2) * sign);
        });
        this.position.setX((side * width) / 2 + OFFSET * side);
        this.position.setZ(depth / 2);
        break;
      case "z":
        sphereMeshes.forEach((sphereMesh, i) => {
          const sign = i === 0 ? 1 : -1;
          sphereMesh.position.setX((width / 2) * sign);
        });
        boxMesh.scale.setX(width);

        if (side === 1) {
          this.position.setZ(OFFSET * 1.75);
        } else if (side === -1) {
          this.position.setZ(-OFFSET);
        }
        break;
    }
  }
}

export default StretchHandleGroup;
