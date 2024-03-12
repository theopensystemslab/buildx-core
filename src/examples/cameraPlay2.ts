import createBasicScene from "@/three/createBasicScene";
import GroundCircle from "@/three/objects/GroundCircle";
import OBBMesh from "@/three/objects/OBBMesh";
import {
  AxesHelper,
  CameraHelper,
  Euler,
  MathUtils,
  Matrix3,
  Matrix4,
  Object3D,
  OrthographicCamera,
  Vector3,
} from "three";
import { OBB } from "three-stdlib";
import { GUI } from "dat.gui";

const { addObjectToScene, scene, renderer, camera } = createBasicScene();

const groundCircle = new GroundCircle();
addObjectToScene(groundCircle);

const halfSize = new Vector3(1.5, 1, 2);
const center = new Vector3(-3, 1, -1);
const obbMesh = new OBBMesh(new OBB(center, halfSize));
addObjectToScene(obbMesh);

const axesHelper = new AxesHelper();
addObjectToScene(axesHelper);

// Assuming your viewport size might change, capture these for the camera
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;
const halfFrustumSize = frustumSize * 0.5;
const orthoCamera = new OrthographicCamera(
  -halfFrustumSize * aspect,
  halfFrustumSize * aspect,
  halfFrustumSize,
  -halfFrustumSize,
  1,
  20
);
orthoCamera.position.set(0, 5, 10);
orthoCamera.lookAt(center);

console.log(scene.position);

const cameraHelper = new CameraHelper(orthoCamera);
scene.add(cameraHelper);

// GUI setup
const gui = new GUI();
const cameraFolder = gui.addFolder("Orthographic Camera");
cameraFolder
  .add(orthoCamera, "left")
  .min(-30)
  .max(0)
  .step(1)
  .onChange(() => updateCamera());
cameraFolder
  .add(orthoCamera, "right")
  .min(0)
  .max(30)
  .step(1)
  .onChange(() => updateCamera());
cameraFolder
  .add(orthoCamera, "top")
  .min(0)
  .max(30)
  .step(1)
  .onChange(() => updateCamera());
cameraFolder
  .add(orthoCamera, "bottom")
  .min(-30)
  .max(0)
  .step(1)
  .onChange(() => updateCamera());
cameraFolder
  .add(orthoCamera, "near")
  .min(0.1)
  .max(100)
  .onChange(() => updateCamera());
cameraFolder
  .add(orthoCamera, "far")
  .min(0.1)
  .max(100)
  .onChange(() => updateCamera());
cameraFolder.open();

function updateCamera() {
  orthoCamera.updateProjectionMatrix();
  cameraHelper.update();
}

// Function to render the HUD
function renderHUD() {
  // Set the renderer to use the scissor test
  renderer.setScissorTest(true);

  // Define the scissor rectangle region in the bottom-left corner
  const hudWidth = 256; // HUD width in pixels
  const hudHeight = 256; // HUD height in pixels
  const left = 10; // Distance from the bottom-left corner of the canvas
  const bottom = 10;

  // Set the scissor area and the viewport
  renderer.setScissor(left, bottom, hudWidth, hudHeight);
  renderer.setViewport(left, bottom, hudWidth, hudHeight);

  // Render the scene from the orthographic camera's perspective
  renderer.render(scene, orthoCamera);

  // Turn off the scissor test so that other render operations are not affected
  renderer.setScissorTest(false);
}

// In your animation loop, call this function
function animate() {
  requestAnimationFrame(animate);

  // Render the main scene first
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);

  // Render the HUD on top
  renderHUD();
}

animate();

const { floor, random } = Math;

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @return {number} A random integer between min and max.
 */
function getRandomInt(min: number, max: number) {
  return floor(random() * (max - min + 1)) + min;
}

function randomizeOBB() {
  const maxXZPosition = 10;
  const maxHalfSize = 3;

  // Use getRandomInt to simplify the generation of sizes and positions
  const halfSize = new Vector3(
    getRandomInt(1, maxHalfSize),
    getRandomInt(1, maxHalfSize),
    getRandomInt(1, maxHalfSize)
  );

  const position = new Vector3(
    getRandomInt(-maxXZPosition, maxXZPosition),
    halfSize.y,
    getRandomInt(-maxXZPosition, maxXZPosition)
  );

  // Rotation (unchanged, as precision for rotations is typically fine as is)
  const rotation = new Matrix3().setFromMatrix4(
    new Matrix4().makeRotationFromEuler(
      new Euler(0, random() * Math.PI, 0) // only rotate around Y-axis
    )
  );

  return new OBB(position, halfSize, rotation);
}

window.addEventListener("keydown", event => {
  if (event.key === " " || event.key === "Enter") {
    // Spacebar or Enter key
    const newOBB = randomizeOBB();
    obbMesh.updateOBB(newOBB); // Assuming obbMesh is your instance of OBBMesh

    adjustCameraToOBBMesh(
      obbMesh,
      orthoCamera,
      obbMesh.userData.obb.halfSize.z * 2,
      45,
      45
    );

    adjustCameraFrustum(obbMesh, orthoCamera, 3);
  }
});

function adjustCameraToOBBMesh(
  obbMesh: Object3D,
  camera: OrthographicCamera,
  distance: number,
  upwardsAngleDeg: number,
  sideAngleDeg: number
): void {
  const meshPosition = obbMesh.position;

  // Convert angles from degrees to radians
  const upwardsAngleRad = MathUtils.degToRad(upwardsAngleDeg);
  const sideAngleRad = MathUtils.degToRad(sideAngleDeg);

  // Calculate the front direction of the OBBMesh
  const frontDirection = new Vector3(0, 0, -1).applyQuaternion(
    obbMesh.quaternion
  );

  // Calculate the side direction (perpendicular to the front and up direction)
  const sideDirection = new Vector3()
    .crossVectors(frontDirection, new Vector3(0, 1, 0))
    .normalize();

  // Calculate the upwards direction (perpendicular to the front and side directions)
  const upwardsDirection = new Vector3()
    .crossVectors(sideDirection, frontDirection)
    .normalize();

  // Apply the side and upwards rotation
  const cameraOffset = new Vector3()
    .addScaledVector(frontDirection, -distance)
    .addScaledVector(sideDirection, Math.sin(sideAngleRad) * distance)
    .addScaledVector(upwardsDirection, Math.sin(upwardsAngleRad) * distance);

  // Update the camera position
  camera.position.copy(meshPosition.clone().add(cameraOffset));

  // Make the camera look at the OBBMesh center
  camera.lookAt(meshPosition);
}

function adjustCameraFrustum(
  obbMesh: Object3D,
  camera: OrthographicCamera,
  padding = 1
) {
  const halfSize = obbMesh.userData.obb.halfSize;

  // Calculate frustum dimensions based on the OBB's halfSize
  const aspectRatio = camera.right / camera.top;
  camera.left = -(halfSize.x + padding); // Include padding to ensure the mesh is not clipped at the edges
  camera.right = halfSize.x + padding;
  camera.top = halfSize.y + padding;
  camera.bottom = -(halfSize.y + padding);

  // Adjust for aspect ratio
  if ((halfSize.x * 2) / (halfSize.y * 2) < aspectRatio) {
    const newWidth = (halfSize.y * 2 + padding * 2) * aspectRatio;
    camera.left = -newWidth / 2;
    camera.right = newWidth / 2;
  } else {
    const newHeight = (halfSize.x * 2 + padding * 2) / aspectRatio;
    camera.top = newHeight / 2;
    camera.bottom = -newHeight / 2;
  }

  // Adjust the near and far planes based on the size and position of the OBBMesh
  camera.near = padding;
  camera.far = halfSize.z * 2 + padding * 2; // Ensure the far plane is beyond the furthest point of the OBBMesh

  camera.updateProjectionMatrix();
}
