import { createBasicScene } from "@/index";
import GroundCircle from "@/three/objects/GroundCircle";
import OBBMesh from "@/three/objects/OBBMesh";
import { cameraFrameOBB2 } from "@/three/utils/camera";
import { PI, floor, random } from "@/utils/math";
import { GUI } from "dat.gui";
import {
  AxesHelper,
  CameraHelper,
  Euler,
  Matrix3,
  Matrix4,
  OrthographicCamera,
  Vector3,
} from "three";
import { OBB } from "three-stdlib";
import PngSnapshotsWorker from "@/workers/png-snapshots/PngSnapshotsWorker?worker";

const snapshotWorker = new PngSnapshotsWorker();

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

const cameraHelper = new CameraHelper(orthoCamera);
// scene.add(cameraHelper);

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
      new Euler(0, random() * PI, 0) // only rotate around Y-axis
    )
  );

  return new OBB(position, halfSize, rotation);
}

window.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    // Spacebar or Enter key
    const newOBB = randomizeOBB();
    obbMesh.updateOBB(newOBB); // Assuming obbMesh is your instance of OBBMesh

    cameraFrameOBB2(orthoCamera, obbMesh.userData.obb);

    snapshotWorker.postMessage({
      objectJson: obbMesh.toJSON(),
      halfSize: obbMesh.userData.obb.halfSize.toArray(),
    });
  }
});

snapshotWorker.onmessage = ({ data }) => console.log(data);
