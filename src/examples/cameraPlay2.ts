import createBasicScene from "@/three/createBasicScene";
import GroundCircle from "@/three/objects/GroundCircle";
import OBBMesh from "@/three/objects/OBBMesh";
import { AxesHelper, CameraHelper, OrthographicCamera, Vector3 } from "three";
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
