import { max, sin } from "@/utils/math";
import {
  Camera,
  MathUtils,
  Matrix4,
  Object3D,
  OrthographicCamera,
  Quaternion,
  Vector3,
} from "three";
import { OBB } from "three-stdlib";

export const cameraFrameOBB = (
  camera: OrthographicCamera,
  obb: OBB,
  upwardsAngleDeg: number = 45,
  sideAngleDeg: number = 45,
  scalePadding: number = 1, // Default scalePadding value
  aspectRatio: number = 1 // Default aspect ratio set to 1 for a square HUD
): void => {
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
};

export const cameraFrameOBB2 = (
  camera: OrthographicCamera,
  obb: OBB,
  aspectRatio: number = 1
) => {
  const obbCenter = obb.center.clone();

  camera.position.set(obbCenter.x + 1, obbCenter.y + 1, obbCenter.z - 1);

  camera.lookAt(obbCenter);

  const obbSize = obb.halfSize.clone().multiplyScalar(2); // Ensure your OBB structure has a method to compute its size
  const maxDimension = Math.max(obbSize.x, obbSize.y, obbSize.z);

  // Step 3: Adjust camera to frame the OBB
  const distance = maxDimension * 1.5; // Multiplier adjusts the distance to ensure the OBB is framed well
  const direction = new Vector3()
    .subVectors(camera.position, obbCenter)
    .normalize();
  camera.position.copy(obbCenter).add(direction.multiplyScalar(distance));

  // Update camera frustum
  camera.left = -maxDimension * aspectRatio;
  camera.right = maxDimension * aspectRatio;
  camera.top = maxDimension;
  camera.bottom = -maxDimension;
  camera.near = 0.01; // Assuming these values are suitable, adjust if needed
  camera.far = 1000; // Make sure this is enough to cover the scene

  camera.updateProjectionMatrix(); // Important to apply changes
};

export type Side = "LEFT" | "RIGHT";

export const getSide = (object: Object3D, camera: Camera) => {
  const houseDirection = new Vector3(0, 0, -1);
  const rotationMatrix = new Matrix4().makeRotationY(object.rotation.y);
  houseDirection.applyMatrix4(rotationMatrix);

  const cameraDirection = new Vector3();
  camera.getWorldDirection(cameraDirection);

  const v = new Vector3();
  v.crossVectors(houseDirection, cameraDirection);

  return v.y < 0 ? "LEFT" : "RIGHT";
};
