import { max, sin } from "@/utils/math";
import {
  MathUtils,
  Matrix4,
  OrthographicCamera,
  Quaternion,
  Vector3,
} from "three";
import { OBB } from "three-stdlib";

function adjustCameraToAndFrameOBB(
  obb: OBB,
  camera: OrthographicCamera,
  upwardsAngleDeg: number,
  sideAngleDeg: number,
  scalePadding: number = 1, // Default scalePadding value
  aspectRatio: number = 1 // Default aspect ratio set to 1 for a square HUD
): void {
  const halfSize = obb.halfSize;
  const distance = halfSize.length() * 2; // Distance is a function of the OBB's size
  const padding = halfSize.length() * scalePadding; // Padding scaled based on the OBB's size

  // Convert angles from degrees to radians
  const upwardsAngleRad = MathUtils.degToRad(upwardsAngleDeg);
  const sideAngleRad = MathUtils.degToRad(sideAngleDeg);

  // Get the OBB's rotation in Quaternion
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().setFromMatrix3(obb.rotation)
  );

  // Calculate the front direction of the OBB
  const frontDirection = new Vector3(0, 0, -1).applyQuaternion(quaternion);

  // Calculate the side direction (perpendicular to the front and up direction)
  const sideDirection = new Vector3()
    .crossVectors(frontDirection, new Vector3(0, 1, 0))
    .normalize();

  // Calculate the upwards direction (perpendicular to the front and side directions)
  const upwardsDirection = new Vector3()
    .crossVectors(sideDirection, frontDirection)
    .normalize();

  // Apply the side and upwards rotation to the position offset
  const cameraOffset = new Vector3()
    .addScaledVector(frontDirection, -distance)
    .addScaledVector(sideDirection, sin(sideAngleRad) * distance)
    .addScaledVector(upwardsDirection, sin(upwardsAngleRad) * distance);

  // Update the camera position
  camera.position.copy(obb.center.clone().add(cameraOffset));

  // Make the camera look at the OBB center
  camera.lookAt(obb.center);

  // Calculate frustum dimensions based on the OBB's halfSize
  // The frustum dimensions are calculated differently based on the aspect ratio
  if (aspectRatio >= 1) {
    camera.left = -halfSize.x * aspectRatio - padding;
    camera.right = halfSize.x * aspectRatio + padding;
    camera.top = halfSize.y + padding;
    camera.bottom = -halfSize.y - padding;
  } else {
    camera.left = -halfSize.x - padding;
    camera.right = halfSize.x + padding;
    camera.top = (halfSize.y + padding) / aspectRatio;
    camera.bottom = -(halfSize.y + padding) / aspectRatio;
  }

  // Set near and far planes based on the distance and the OBB's size
  camera.near = max(distance - halfSize.length() - padding, 0.1); // Ensure the near plane is before the OBB
  camera.far = distance + halfSize.length() + padding; // Ensure the far plane is beyond the OBB

  // Update the camera projection matrix
  camera.updateProjectionMatrix();
}

export default adjustCameraToAndFrameOBB;
