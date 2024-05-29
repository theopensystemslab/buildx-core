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

// Instantiate the gesture manager
new GestureManager({
  domElement: renderer.domElement,
  camera,
  cameraControls,
  gestureEnabledObjects,
  onGestureStart: () => {
    console.log("Gesture started, disabling camera controls");
    cameraControls.enabled = false;
  },
  onGestureEnd: () => {
    console.log("Gesture ended, enabling camera controls");
    cameraControls.enabled = true;
  },
  onSingleTap: (intersection) => {
    console.log("Single tap detected", intersection);
  },
  onDoubleTap: (intersection) => {
    console.log("Double tap detected", intersection);
  },
  onLongTap: (intersection) => {
    console.log("Long tap detected", intersection);
  },
  onTapMissed: () => {
    console.log("Tap missed detected");
  },
  onDragStart: (intersection) => {
    console.log("Drag started", intersection);
  },
  onDragProgress: (intersection) => {
    console.log("Drag in progress", intersection);
  },
  onDragEnd: (intersection) => {
    console.log("Drag ended", intersection);
  },
});

function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
