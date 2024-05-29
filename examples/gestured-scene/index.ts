// main.ts
import {
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  Clock,
  Vector2,
  Vector3,
  Vector4,
  Quaternion,
  Matrix4,
  Spherical,
  Box3,
  Sphere,
  Raycaster,
} from "three";
import CameraControls from "camera-controls";
import GestureManager from "./GestureManager";

const subsetOfTHREE = {
  Vector2,
  Vector3,
  Vector4,
  Quaternion,
  Matrix4,
  Spherical,
  Box3,
  Sphere,
  Raycaster,
};

CameraControls.install({ THREE: subsetOfTHREE });

const clock = new Clock();
const camera = new PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new Scene();
const cameraControls = new CameraControls(camera, renderer.domElement);

cameraControls.setLookAt(5, 5, 5, 0, 0, 0);

// Create a test object and add it to the scene
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshBasicMaterial({ color: 0x00ff00 });
const testObject = new Mesh(geometry, material);
scene.add(testObject);

// List of objects that should respond to gestures
const gestureEnabledObjects: Mesh[] = [testObject];

// Instantiate the gesture handler
const gestureHandler = new GestureManager(
  camera,
  cameraControls,
  gestureEnabledObjects
);

// Set up pointer events for gesture detection
renderer.domElement.addEventListener("pointerdown", (event) =>
  gestureHandler.onPointerDown(event)
);
renderer.domElement.addEventListener("pointerup", (event) =>
  gestureHandler.onPointerUp(event)
);
renderer.domElement.addEventListener("pointermove", (event) =>
  gestureHandler.onPointerMove(event)
);

function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
