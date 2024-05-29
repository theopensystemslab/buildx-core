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
  onDragStart: (intersection) => {
    console.log("Drag Start", intersection);
  },
  onDragProgress: (progress) => {
    if (progress.object) {
      progress.object.position.copy(
        progress.originalPosition.clone().add(progress.delta)
      );
      console.log("Drag Progress", progress.currentPoint);
    }
  },
  onDragEnd: (intersection) => {
    console.log("Drag End", intersection);
  },
});

function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
