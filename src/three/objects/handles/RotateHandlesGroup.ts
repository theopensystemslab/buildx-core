import { CircleGeometry, Group, Mesh, PlaneGeometry } from "three";
import HandleGroup from "./HandleGroup";
import handleMaterial from "./handleMaterial";
import { OBB } from "three-stdlib";
import { HouseGroup } from "../house/HouseGroup";
import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import RotateHandleMesh from "./RotateHandleMesh";
import { DEFAULT_LAYER, HIDDEN_LAYER } from "@/three/utils/layers";

const HANDLE_THICKNESS = 0.3;
const ROTATE_HANDLE_OFFSET = 2;
const CIRCLE_SCALE = 1;

const circleGeometry = new CircleGeometry(0.5, 16);
const planeGeometry = new PlaneGeometry(1, 1);

class RotateHandleGroup extends HandleGroup {
  plane: Mesh;
  circle: Mesh;
  axis: "x" | "z";

  constructor(axis: "x" | "z") {
    super();

    this.axis = axis;

    this.plane = new RotateHandleMesh(planeGeometry, handleMaterial);
    this.circle = new RotateHandleMesh(circleGeometry, handleMaterial);

    this.add(this.plane, this.circle);

    this.rotation.x = -Math.PI / 2;
    this.position.y = 0.01;
  }

  setSize(obb: OBB) {
    const { halfSize } = obb;

    if (this.axis === "x") {
      const target = halfSize.x + ROTATE_HANDLE_OFFSET;
      this.plane.scale.set(target, HANDLE_THICKNESS, 1);
      this.plane.position.setX(target / 2);
      this.circle.position.set(target, 0, 0);
      this.circle.scale.setScalar(CIRCLE_SCALE);
    }
    if (this.axis === "z") {
      const target = halfSize.z + ROTATE_HANDLE_OFFSET;
      this.plane.scale.set(HANDLE_THICKNESS, target, 1);
      // y is z because of rotation
      this.plane.position.set(0, target / 2, 0);
      this.circle.position.set(0, target, 0);
      this.circle.scale.setScalar(CIRCLE_SCALE);
    }
  }
}

class RotateHandlesGroup extends Group {
  widthHandle: RotateHandleGroup;
  depthHandle: RotateHandleGroup;
  houseGroup: HouseGroup;
  constructor(houseGroup: HouseGroup) {
    super();
    this.houseGroup = houseGroup;
    this.widthHandle = new RotateHandleGroup("x");
    this.depthHandle = new RotateHandleGroup("z");
    this.add(this.widthHandle);
    this.add(this.depthHandle);
  }

  updateHandles() {
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        this.widthHandle.setSize(activeLayoutGroup.obb);
        this.depthHandle.setSize(activeLayoutGroup.obb);
      })
    );
  }

  show() {
    this.traverse((x) => x.layers.set(DEFAULT_LAYER));
  }

  hide() {
    this.traverse((x) => x.layers.set(HIDDEN_LAYER));
  }
}

export default RotateHandlesGroup;
