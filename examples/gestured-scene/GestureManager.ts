// gestureHandler.ts
import { Raycaster, Vector2, Object3D, PerspectiveCamera, Mesh } from "three";
import CameraControls from "camera-controls";

class GestureManager {
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private gestureEnabledObjects: Object3D[];
  private camera: PerspectiveCamera;
  private cameraControls: CameraControls;
  private pointerDownTime = 0;
  private pointerIsDown = false;
  private pointerMoved = false;
  private clickTimeoutId: NodeJS.Timeout | null = null;
  private doubleClickThreshold = 300; // milliseconds
  private longPressThreshold = 500; // milliseconds
  private dragThreshold = 5; // pixels
  private initialPointerPosition = new Vector2();
  private isDraggingGestureEnabledObject = false;
  private currentGestureObject: Mesh | null = null;

  constructor(
    camera: PerspectiveCamera,
    cameraControls: CameraControls,
    gestureEnabledObjects: Object3D[]
  ) {
    this.camera = camera;
    this.cameraControls = cameraControls;
    this.gestureEnabledObjects = gestureEnabledObjects;
  }

  public onPointerDown(event: PointerEvent) {
    this.pointerIsDown = true;
    this.pointerMoved = false;
    this.isDraggingGestureEnabledObject = false;
    this.pointerDownTime = performance.now();
    this.initialPointerPosition.set(event.clientX, event.clientY);

    // Update the pointer variable for raycasting
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Perform raycasting to detect if an object was hit
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.gestureEnabledObjects
    );

    if (intersects.length > 0) {
      // Disable camera controls if we hit a gestureable object
      this.cameraControls.enabled = false;
      this.isDraggingGestureEnabledObject = true;
      this.currentGestureObject = intersects[0].object as Mesh;
      console.log(
        "Pointer down on gesture-enabled object",
        this.currentGestureObject
      );
    } else {
      // Otherwise, enable camera controls
      this.cameraControls.enabled = true;
      this.currentGestureObject = null;
      console.log("Pointer down on non-gesture area");
    }
  }

  public onPointerUp(event: PointerEvent) {
    const pointerUpTime = performance.now();
    const duration = pointerUpTime - this.pointerDownTime;

    if (!this.pointerMoved) {
      if (duration < this.doubleClickThreshold) {
        if (this.clickTimeoutId) {
          clearTimeout(this.clickTimeoutId);
          this.clickTimeoutId = null;
          this.handleDoubleClick(event);
        } else {
          this.clickTimeoutId = setTimeout(() => {
            this.handleSingleClick(event);
            this.clickTimeoutId = null;
          }, this.doubleClickThreshold);
        }
      } else if (duration >= this.longPressThreshold) {
        // Handle long press
        this.handleLongPress(event);
      }
    }

    this.pointerIsDown = false;
    this.cameraControls.enabled = true; // Re-enable camera controls after gesture handling
  }

  public onPointerMove(event: PointerEvent) {
    if (this.pointerIsDown) {
      const moveDistance = this.initialPointerPosition.distanceTo(
        new Vector2(event.clientX, event.clientY)
      );

      if (moveDistance > this.dragThreshold) {
        this.pointerMoved = true;
        // Handle drag logic here
        this.handleDrag(event, this.isDraggingGestureEnabledObject);
      }
    }
  }

  private handleSingleClick(_event: PointerEvent) {
    // Implement single click logic
    console.log("Single click detected");
  }

  private handleDoubleClick(_event: PointerEvent) {
    // Implement double click logic
    console.log("Double click detected");
  }

  private handleLongPress(_event: PointerEvent) {
    // Implement long press logic
    console.log("Long press detected");
  }

  private handleDrag(
    _event: PointerEvent,
    isDraggingGestureEnabledObject: boolean
  ) {
    // Implement drag logic
    if (isDraggingGestureEnabledObject) {
      console.log(
        "Dragging detected on gesture-enabled object",
        this.currentGestureObject
      );
    } else {
      console.log("Dragging detected on non-gesture area");
    }
  }
}

export default GestureManager;
