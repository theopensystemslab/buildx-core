import { CircleGeometry, Group, Mesh, PlaneGeometry } from "three";
import { OBB } from "three-stdlib";
import HandleGroup from "./HandleGroup";
import handleMaterial from "./handleMaterial";
import RotateHandleGroup from "./RotateHandleGroup";

const HANDLE_THICKNESS = 0.3;
const GRIP_RADIUS = 0.5;

class RotateHandlesGroup extends HandleGroup {
  widthHandle: RotateHandleGroup;
  depthHandle: RotateHandleGroup;

  constructor(obb: OBB) {
    super();
    this.widthHandle = this.createHandle(obb, "width");
    this.depthHandle = this.createHandle(obb, "depth");
    this.add(this.widthHandle, this.depthHandle);
  }

  createHandle(obb: OBB, axis: "width" | "depth"): RotateHandleGroup {
    const isWidthAxis = axis === "width";
    const length = isWidthAxis ? obb.halfSize.x * 2 : obb.halfSize.z * 2;

    // Create shaft (plane)
    const shaftGeometry = new PlaneGeometry(length, HANDLE_THICKNESS);
    const shaftMesh = new Mesh(shaftGeometry, handleMaterial);

    // Create grip (circle)
    const gripGeometry = new CircleGeometry(GRIP_RADIUS, 32);
    const gripMesh = new Mesh(gripGeometry, handleMaterial);

    // Position grip at the end of the shaft
    gripMesh.position.set(
      isWidthAxis ? length / 2 : 0,
      0,
      isWidthAxis ? 0 : length / 2
    );

    // Combine shaft and grip
    const handle = new Group();
    handle.add(shaftMesh, gripMesh);

    // Position handle
    handle.position.set(
      isWidthAxis ? obb.center.x : obb.center.x + obb.halfSize.x,
      obb.center.y,
      isWidthAxis ? obb.center.z + obb.halfSize.z : obb.center.z
    );

    // Rotate depth handle to align with z-axis
    if (!isWidthAxis) {
      handle.rotateY(Math.PI / 2);
    }

    return handle;
  }

  updateHandles(obb: OBB) {
    this.widthHandle.scale.setX(obb.halfSize.x * 2);
    this.widthHandle.position.set(
      obb.center.x,
      obb.center.y,
      obb.center.z + obb.halfSize.z
    );

    this.depthHandle.scale.setX(obb.halfSize.z * 2);
    this.depthHandle.position.set(
      obb.center.x + obb.halfSize.x,
      obb.center.y,
      obb.center.z
    );
  }
}

export default RotateHandlesGroup;
