import {
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  Vector2,
  Vector3,
  Vector4,
  Quaternion,
  Matrix4,
  Spherical,
  Box3,
  Sphere,
  Raycaster,
  Clock,
} from "three";
import CameraControls from "camera-controls";

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

// Raycaster for detecting pointer intersections
const raycaster = new Raycaster();
const pointer = new Vector2();

// Gesture detection variables
let pointerDownTime = 0;
let pointerIsDown = false;
let pointerMoved = false;
let clickTimeoutId: NodeJS.Timeout | null = null;
const doubleClickThreshold = 300; // milliseconds
const longPressThreshold = 500; // milliseconds
const dragThreshold = 5; // pixels
let initialPointerPosition = new Vector2();
let isDraggingGestureEnabledObject = false; // Flag to track if dragging a gesture-enabled object

// Set up pointer events for gesture detection
renderer.domElement.addEventListener("pointerdown", onPointerDown);
renderer.domElement.addEventListener("pointerup", onPointerUp);
renderer.domElement.addEventListener("pointermove", onPointerMove);

function onPointerDown(event: PointerEvent) {
  pointerIsDown = true;
  pointerMoved = false;
  isDraggingGestureEnabledObject = false;
  pointerDownTime = performance.now();
  initialPointerPosition.set(event.clientX, event.clientY);

  // Update the pointer variable for raycasting
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Perform raycasting to detect if an object was hit
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(gestureEnabledObjects);

  if (intersects.length > 0) {
    // Disable camera controls if we hit a gestureable object
    cameraControls.enabled = false;
    isDraggingGestureEnabledObject = true;
    console.log("Pointer down on gesture-enabled object");
  } else {
    // Otherwise, enable camera controls
    cameraControls.enabled = true;
    console.log("Pointer down on non-gesture area");
  }
}

function onPointerUp(event: PointerEvent) {
  const pointerUpTime = performance.now();
  const duration = pointerUpTime - pointerDownTime;

  if (!pointerMoved) {
    if (duration < doubleClickThreshold) {
      if (clickTimeoutId) {
        clearTimeout(clickTimeoutId);
        clickTimeoutId = null;
        handleDoubleClick(event);
      } else {
        clickTimeoutId = setTimeout(() => {
          handleSingleClick(event);
          clickTimeoutId = null;
        }, doubleClickThreshold);
      }
    } else if (duration >= longPressThreshold) {
      // Handle long press
      handleLongPress(event);
    }
  }

  pointerIsDown = false;
  cameraControls.enabled = true; // Re-enable camera controls after gesture handling
}

function onPointerMove(event: PointerEvent) {
  if (pointerIsDown) {
    const moveDistance = initialPointerPosition.distanceTo(
      new Vector2(event.clientX, event.clientY)
    );

    if (moveDistance > dragThreshold) {
      pointerMoved = true;
      // Handle drag logic here
      handleDrag(event, isDraggingGestureEnabledObject);
    }
  }
}

function handleSingleClick(_event: PointerEvent) {
  // Implement single click logic
  console.log("Single click detected");
}

function handleDoubleClick(_event: PointerEvent) {
  // Implement double click logic
  console.log("Double click detected");
}

function handleLongPress(_event: PointerEvent) {
  // Implement long press logic
  console.log("Long press detected");
}

function handleDrag(
  _event: PointerEvent,
  isDraggingGestureEnabledObject: boolean
) {
  // Implement drag logic
  if (isDraggingGestureEnabledObject) {
    console.log("Dragging detected on gesture-enabled object");
  } else {
    console.log("Dragging detected on non-gesture area");
  }
}

function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
