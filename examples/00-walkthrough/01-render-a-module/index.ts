import { cachedModulesTE } from "@/index";
import { defaultModuleGroupCreator } from "@/three/objects/house/ModuleGroup";
import { A, O, TE } from "@/utils/functions";
import CameraControls from "camera-controls";
import { pipe } from "fp-ts/lib/function";
import * as THREE from "three";
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { flow } from "fp-ts/function";

// Initialize CameraControls with subset
CameraControls.install({ THREE: THREE });

// Create scene, camera, and renderer
const scene = new Scene();
const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new WebGLRenderer();

// Setup renderer and add to document
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting
const ambientLight = new AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create camera controls
const cameraControls = new CameraControls(camera, renderer.domElement);
const clock = new Clock();

// Set some reasonable initial camera position and target
cameraControls.setLookAt(10, 10, 10, 0, 0, 0, true);
cameraControls.dollyTo(15, true);

// Position camera further back
camera.position.z = 10;

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Animation loop
function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

// Load and render first module
pipe(
  cachedModulesTE,
  TE.map(
    flow(
      A.head,
      O.map((firstModule) =>
        pipe(
          defaultModuleGroupCreator({
            buildModule: firstModule,
          }),
          TE.map((moduleGroup) => {
            (moduleGroup as any).__isModuleGroup = true;
            scene.add(moduleGroup);
          })
        )()
      )
    )
  )
)();
