import CameraControls from "camera-controls";
import * as THREE from "three";
import {
  AmbientLight,
  BoxGeometry,
  Clock,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import GestureManager from "./hover-log/GestureManager";

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

// Add a simple cube to test gestures
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshPhongMaterial({ color: 0x00ff00 });
const cube = new Mesh(geometry, material);
scene.add(cube);

// Create gesture manager
// @ts-ignore
const gestureManager = new GestureManager({
  domElement: renderer.domElement,
  camera: camera,
  gestureEnabledObjects: [cube],
});

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

  // Optional: Rotate the cube
  if (cube) cube.rotation.x += 0.01;

  renderer.render(scene, camera);
}

animate();
