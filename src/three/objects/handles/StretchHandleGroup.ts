import { A } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { BoxGeometry, SphereGeometry } from "three";
import { ColumnLayoutGroup } from "../house/ColumnLayoutGroup";
import HandleGroup from "./HandleGroup";
import StretchHandleMesh from "./StretchHandleMesh";
import handleMaterial from "./handleMaterial";
import AbstractStretchManager from "@/three/managers/AbstractStretchManagers";

export type StretchAxis = "x" | "z";
export type StretchSide = 1 | -1;

const sphereGeom = new SphereGeometry(0.5);
const boxGeom = new BoxGeometry(1, 1, 1);

const OFFSET = 0.5;

class StretchHandleGroup extends HandleGroup {
  userData: {
    axis: StretchAxis;
    side: StretchSide;
  };
  boxMesh: StretchHandleMesh;
  sphereMeshes: [StretchHandleMesh, StretchHandleMesh];
  manager: AbstractStretchManager;

  constructor({
    axis,
    side,
    manager,
  }: {
    axis: StretchAxis;
    side: StretchSide;
    manager: AbstractStretchManager;
  }) {
    super();
    this.manager = manager;
    this.userData = {
      axis,
      side,
    };
    this.boxMesh = this.createBoxMesh();
    this.sphereMeshes = this.createSphereMeshes();
    this.add(this.boxMesh, ...this.sphereMeshes);
  }

  private createBoxMesh(): StretchHandleMesh {
    const boxMesh = new StretchHandleMesh(boxGeom, handleMaterial);
    boxMesh.scale.setY(0.001);
    return boxMesh;
  }

  private createSphereMeshes(): [StretchHandleMesh, StretchHandleMesh] {
    return pipe(
      A.replicate(2, sphereGeom),
      A.map((geom): StretchHandleMesh => {
        const mesh = new StretchHandleMesh(geom, handleMaterial);
        mesh.scale.setY(0.001);
        return mesh;
      })
    ) as [StretchHandleMesh, StretchHandleMesh];
  }

  syncDimensions(layoutGroup: ColumnLayoutGroup) {
    const {
      userData: { depth, width },
    } = layoutGroup;
    const {
      boxMesh,
      sphereMeshes,
      userData: { axis, side },
    } = this;

    switch (axis) {
      case "x":
        boxMesh.scale.setZ(depth);
        sphereMeshes.forEach((sphereMesh, i) => {
          const sign = i === 0 ? 1 : -1;
          sphereMesh.position.setZ((depth / 2) * sign);
        });
        this.position.setX((side * width) / 2 + OFFSET * side);
        // this.position.setZ(depth / 2);
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

    const scale = 0.6;

    this.position.setY(0.01);
    this.scale.set(scale, 1, scale);
  }
}

export default StretchHandleGroup;
