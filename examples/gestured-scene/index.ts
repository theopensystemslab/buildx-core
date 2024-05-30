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
  gestureEnabledObjects,
  onGestureStart: () => {
    cameraControls.enabled = false;
  },
  onGestureEnd: () => {
    cameraControls.enabled = true;
  },
  onDragProgress: ({
    delta: { x: x1, z: z1 },
    object,
    originalPosition: { x: x0, y, z: z0 },
  }) => {
    object?.position.set(x0 + x1, y, z0 + z1);
  },
});

function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
