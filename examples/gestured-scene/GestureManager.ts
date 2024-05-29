// GestureManager.ts
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
  private tapTimeoutId: NodeJS.Timeout | null = null;
  private longTapTimeoutId: NodeJS.Timeout | null = null;
  private doubleTapThreshold = 300; // milliseconds
  private longTapThreshold = 500; // milliseconds
  private dragThreshold = 5; // pixels
  private initialPointerPosition = new Vector2();
  private isDraggingGestureEnabledObject = false;
  private currentGestureObject: Mesh | null = null;
  private isLongTapOnGestureObject = false;
  private tapCount = 0;

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
    this.isLongTapOnGestureObject = false;
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
      this.isLongTapOnGestureObject = true;
      this.currentGestureObject = intersects[0].object as Mesh;
      console.log(
        "Pointer down on gesture-enabled object",
        this.currentGestureObject
      );
    } else {
      // Otherwise, enable camera controls
      this.cameraControls.enabled = true;
      this.currentGestureObject = null;
      // console.log("Pointer down on non-gesture area");
    }

    // Set up long tap detection
    this.longTapTimeoutId = setTimeout(() => {
      if (!this.pointerMoved && this.isLongTapOnGestureObject) {
        this.handleLongTap(event);
      }
    }, this.longTapThreshold);
  }

  public onPointerUp(event: PointerEvent) {
    const pointerUpTime = performance.now();
    const duration = pointerUpTime - this.pointerDownTime;

    // Clear the long tap timeout if the pointer is released
    if (this.longTapTimeoutId) {
      clearTimeout(this.longTapTimeoutId);
      this.longTapTimeoutId = null;
    }

    if (this.pointerMoved) {
      this.handleDragEnd(event, this.isDraggingGestureEnabledObject);
    } else if (!this.pointerMoved) {
      if (duration < this.longTapThreshold) {
        this.tapCount++;
        if (this.tapCount === 1) {
          this.handleSingleTap(event);
          this.tapTimeoutId = setTimeout(() => {
            this.tapCount = 0;
          }, this.doubleTapThreshold);
        } else if (this.tapCount === 2) {
          if (this.tapTimeoutId) {
            clearTimeout(this.tapTimeoutId);
            this.tapTimeoutId = null;
          }
          this.handleDoubleTap(event);
          this.tapCount = 0;
        }
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
        if (!this.pointerMoved) {
          this.handleDragStart(event, this.isDraggingGestureEnabledObject);
        }
        this.pointerMoved = true;

        // Clear the long tap timeout if the pointer is moved
        if (this.longTapTimeoutId) {
          clearTimeout(this.longTapTimeoutId);
          this.longTapTimeoutId = null;
        }

        // Handle drag logic here
        this.handleDrag(event, this.isDraggingGestureEnabledObject);
      }
    }
  }

  private handleSingleTap(_event: PointerEvent) {
    // Implement single tap logic
    console.log("Single tap detected");
  }

  private handleDoubleTap(_event: PointerEvent) {
    // Implement double tap logic
    console.log("Double tap detected");
  }

  private handleLongTap(_event: PointerEvent) {
    // Implement long tap logic
    console.log("Long tap detected");
  }

  private handleDragStart(
    _event: PointerEvent,
    isDraggingGestureEnabledObject: boolean
  ) {
    // Implement drag start logic
    if (isDraggingGestureEnabledObject) {
      console.log(
        "Drag started on gesture-enabled object",
        this.currentGestureObject
      );
    }
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
      // console.log("Dragging detected on non-gesture area");
    }
  }

  private handleDragEnd(
    _event: PointerEvent,
    isDraggingGestureEnabledObject: boolean
  ) {
    // Implement drag end logic
    if (isDraggingGestureEnabledObject) {
      console.log(
        "Drag ended on gesture-enabled object",
        this.currentGestureObject
      );
      // Add your code to handle the end of the drag gesture here
    }
  }
}

export default GestureManager;
