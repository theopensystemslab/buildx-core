import {
  Raycaster,
  Vector2,
  Object3D,
  PerspectiveCamera,
  Mesh,
  Intersection,
} from "three";
import CameraControls from "camera-controls";

type GestureHandler = (intersection?: Intersection) => void;

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
  private domElement: HTMLElement;
  private onGestureStart?: () => void;
  private onGestureEnd?: () => void;
  private onSingleTap?: GestureHandler;
  private onDoubleTap?: GestureHandler;
  private onLongTap?: GestureHandler;
  private onTapMissed?: () => void;
  private onDragStart?: GestureHandler;
  private onDragProgress?: GestureHandler;
  private onDragEnd?: GestureHandler;
  private gestureStarted = false; // Flag to track if a gesture has actually started

  constructor(params: {
    domElement: HTMLElement;
    camera: PerspectiveCamera;
    cameraControls: CameraControls;
    gestureEnabledObjects: Object3D[];
    onGestureStart?: () => void;
    onGestureEnd?: () => void;
    onSingleTap?: GestureHandler;
    onDoubleTap?: GestureHandler;
    onLongTap?: GestureHandler;
    onTapMissed?: () => void;
    onDragStart?: GestureHandler;
    onDragProgress?: GestureHandler;
    onDragEnd?: GestureHandler;
  }) {
    this.domElement = params.domElement;
    this.camera = params.camera;
    this.cameraControls = params.cameraControls;
    this.gestureEnabledObjects = params.gestureEnabledObjects;

    this.onGestureStart = params.onGestureStart;
    this.onGestureEnd = params.onGestureEnd;
    this.onSingleTap = params.onSingleTap;
    this.onDoubleTap = params.onDoubleTap;
    this.onLongTap = params.onLongTap;
    this.onTapMissed = params.onTapMissed;
    this.onDragStart = params.onDragStart;
    this.onDragProgress = params.onDragProgress;
    this.onDragEnd = params.onDragEnd;

    this.attachEventListeners();
  }

  private attachEventListeners() {
    this.domElement.addEventListener(
      "pointerdown",
      this.onPointerDown.bind(this)
    );
    this.domElement.addEventListener("pointerup", this.onPointerUp.bind(this));
    this.domElement.addEventListener(
      "pointermove",
      this.onPointerMove.bind(this)
    );
  }

  private onPointerDown(event: PointerEvent) {
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
      this.gestureStarted = true; // Set the gesture started flag
      console.log(
        "Pointer down on gesture-enabled object",
        this.currentGestureObject
      );
      this.onGestureStart?.();
    } else {
      // Otherwise, enable camera controls
      this.cameraControls.enabled = true;
      this.currentGestureObject = null;
      this.gestureStarted = false; // Reset the gesture started flag
      // console.log("Pointer down on non-gesture area");
    }

    // Set up long tap detection
    this.longTapTimeoutId = setTimeout(() => {
      if (!this.pointerMoved && this.isLongTapOnGestureObject) {
        this.onLongTap?.(intersects[0]);
      }
    }, this.longTapThreshold);
  }

  private onPointerUp(_event: PointerEvent) {
    const pointerUpTime = performance.now();
    const duration = pointerUpTime - this.pointerDownTime;

    // Clear the long tap timeout if the pointer is released
    if (this.longTapTimeoutId) {
      clearTimeout(this.longTapTimeoutId);
      this.longTapTimeoutId = null;
    }

    if (this.pointerMoved) {
      this.onDragEnd?.(
        this.isDraggingGestureEnabledObject
          ? this.raycaster.intersectObjects(this.gestureEnabledObjects)[0]
          : undefined
      );
    } else if (!this.pointerMoved) {
      if (duration < this.longTapThreshold) {
        this.tapCount++;
        if (this.tapCount === 1) {
          this.onSingleTap?.(
            this.raycaster.intersectObjects(this.gestureEnabledObjects)[0]
          );
          this.tapTimeoutId = setTimeout(() => {
            this.tapCount = 0;
          }, this.doubleTapThreshold);
        } else if (this.tapCount === 2) {
          if (this.tapTimeoutId) {
            clearTimeout(this.tapTimeoutId);
            this.tapTimeoutId = null;
          }
          this.onDoubleTap?.(
            this.raycaster.intersectObjects(this.gestureEnabledObjects)[0]
          );
          this.tapCount = 0;
        }
      }
      // If no gesture was started and it's a single tap, handle tap on missed space
      if (!this.gestureStarted && this.tapCount === 1) {
        this.onTapMissed?.();
      }
    }

    this.pointerIsDown = false;
    this.cameraControls.enabled = true; // Re-enable camera controls after gesture handling
    if (this.gestureStarted && this.onGestureEnd) {
      this.onGestureEnd();
      this.gestureStarted = false; // Reset the gesture started flag
    }
  }

  private onPointerMove(event: PointerEvent) {
    if (this.pointerIsDown) {
      const moveDistance = this.initialPointerPosition.distanceTo(
        new Vector2(event.clientX, event.clientY)
      );

      if (moveDistance > this.dragThreshold) {
        if (!this.pointerMoved) {
          this.onDragStart?.(
            this.isDraggingGestureEnabledObject
              ? this.raycaster.intersectObjects(this.gestureEnabledObjects)[0]
              : undefined
          );
        }
        this.pointerMoved = true;

        // Clear the long tap timeout if the pointer is moved
        if (this.longTapTimeoutId) {
          clearTimeout(this.longTapTimeoutId);
          this.longTapTimeoutId = null;
        }

        // Handle drag progress logic here
        this.onDragProgress?.(
          this.isDraggingGestureEnabledObject
            ? this.raycaster.intersectObjects(this.gestureEnabledObjects)[0]
            : undefined
        );
      }
    }
  }
}

export default GestureManager;
