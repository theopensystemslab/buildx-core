import { AbstractStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import { BoxGeometry, Material, SphereGeometry } from "three";
import { ADDITION, Brush, Evaluator } from "three-bvh-csg";
import { ColumnLayoutGroup } from "../house/ColumnLayoutGroup";
import HandleGroup from "./HandleGroup";
import StretchHandleBrush from "./StretchHandleMesh";
import StretchHandleMesh from "./StretchHandleMesh";

export type StretchAxis = "x" | "z";
export type StretchSide = 1 | -1;

const sphereGeom = new SphereGeometry(0.5);
const boxGeom = new BoxGeometry(1, 1, 1);

const evaluator = new Evaluator();

const OFFSET = 0.5;

class StretchHandleGroup extends HandleGroup {
  userData: {
    axis: StretchAxis;
    side: StretchSide;
  };
  handleMesh: StretchHandleBrush;
  manager: AbstractStretchManager;
  private material: Material;

  constructor({
    axis,
    side,
    manager,
    material,
  }: {
    axis: StretchAxis;
    side: StretchSide;
    manager: AbstractStretchManager;
    material: Material;
  }) {
    super();
    this.manager = manager;
    this.userData = {
      axis,
      side,
    };
    this.material = material;
    this.handleMesh = this.createCombinedMesh();
    this.add(this.handleMesh);
  }

  private createCombinedMesh() {
    const boxBrush = new Brush(boxGeom);
    const sphere1Brush = new Brush(sphereGeom);
    const sphere2Brush = new Brush(sphereGeom);

    sphere1Brush.position.set(0, 0, 0.5);
    sphere2Brush.position.set(0, 0, -0.5);

    const combinedGeometry = evaluator.evaluate(
      boxBrush,
      sphere1Brush,
      ADDITION
    );
    const combinedGeometry2 = evaluator.evaluate(
      combinedGeometry,
      sphere2Brush,
      ADDITION
    );

    const mesh = new StretchHandleMesh(
      combinedGeometry2.geometry,
      this.material
    );
    mesh.scale.setY(0.001);
    return mesh;
  }

  syncDimensions(layoutGroup: ColumnLayoutGroup) {
    const {
      userData: { depth, width },
    } = layoutGroup;
    const {
      handleMesh,
      userData: { axis, side },
    } = this;

    switch (axis) {
      case "x":
        handleMesh.scale.setZ(depth);
        this.position.setX((side * width) / 2 + OFFSET * side);
        break;
      case "z":
        handleMesh.scale.setX(width);
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

  fade() {
    this.material.opacity = 0.1;
    this.material.needsUpdate = true;
    console.log("fading");
  }

  unfade() {
    this.material.opacity = 1;
    this.material.needsUpdate = true;
    console.log("unfading");
  }
}

export default StretchHandleGroup;
