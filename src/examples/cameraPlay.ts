import createBasicScene from "@/three/createBasicScene";
import GroundCircle from "@/three/objects/GroundCircle";
import OBBMesh from "@/three/objects/OBBMesh";
import { CameraHelper, Clock, OrthographicCamera, Vector3 } from "three";
import { OBB } from "three-stdlib";

const clock = new Clock();

function integrateSceneWithHUD(canvas: HTMLCanvasElement) {
  const { scene, camera, renderer, cameraControls, addObjectToScene } =
    createBasicScene({ canvas });

  const hudCamera = new OrthographicCamera(75, 0.25, 0.1, 1000); // Setup HUD camera
  // Customize HUD camera position and orientation
  hudCamera.position.set(5, 5, 5);

  const cameraHelper = new CameraHelper(hudCamera);
  addObjectToScene(cameraHelper);

  function render() {
    // Clear the entire canvas
    renderer.setClearColor(0x000000); // Background color of the main scene
    renderer.clear(true, true, true);

    // Render main scene covering the entire canvas
    renderer.setScissorTest(false); // Disable for full canvas rendering
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight); // Full canvas size
    renderer.render(scene, camera); // Render the main scene

    // Setup HUD rendering area
    const hudWidth = window.innerWidth * 0.25; // 25% of the canvas width for the HUD
    const hudHeight = window.innerHeight * 0.25; // 25% of the canvas height for the HUD

    // Enable scissor test for HUD area and clear only this part (optional, based on HUD needs)
    renderer.setScissorTest(true);
    renderer.setScissor(
      window.innerWidth - hudWidth,
      window.innerHeight - hudHeight,
      hudWidth,
      hudHeight
    );
    renderer.setViewport(
      window.innerWidth - hudWidth,
      window.innerHeight - hudHeight,
      hudWidth,
      hudHeight
    );
    renderer.setClearColor(0x222222);
    renderer.clear(true, true, true);

    renderer.render(scene, hudCamera);
  }

  function animate() {
    requestAnimationFrame(animate);

    cameraControls.update(clock.getDelta());
    render();
  }

  animate();

  return { scene, camera, hudCamera, renderer, addObjectToScene };
}

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

const { addObjectToScene } = integrateSceneWithHUD(canvas);

const halfSize = new Vector3(1, 2, 3);
const center = new Vector3(3, 2, 1);

addObjectToScene(new GroundCircle());
addObjectToScene(new OBBMesh(new OBB(center, halfSize)));
