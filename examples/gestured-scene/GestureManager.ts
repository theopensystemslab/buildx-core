import {
  Raycaster,
  Vector2,
  Vector3,
  Object3D,
  PerspectiveCamera,
  Plane,
  Intersection,
} from "three";
import CameraControls from "camera-controls";

type GestureHandler = (intersection?: Intersection) => void;
type DetailedDragHandler = (progress: DetailedDragProgress) => void;

type DetailedDragProgress = {
  initialPoint: Vector3;
  lastPoint: Vector3;
  currentPoint: Vector3;
  delta: Vector3;
  originalPosition: Vector3;
  object: Object3D | null;
};

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
  private initialPoint = new Vector3();
  private lastPoint = new Vector3();
  private isDraggingGestureEnabledObject = false;
  private currentGestureObject: Object3D | null = null;
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
  private onDragProgress?: DetailedDragHandler;
  private onDragEnd?: GestureHandler;
  private gestureStarted = false; // Flag to track if a gesture has actually started
  private movementPlaneXZ = new Plane(new Vector3(0, 1, 0), 0); // The plane for XZ tracking
  private movementPlaneY = new Plane(new Vector3(1, 0, 0), 0); // The plane for Y tracking
  private originalPosition = new Vector3(); // Original position of the object being dragged

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
    onDragProgress?: DetailedDragHandler;
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
      this.currentGestureObject = intersects[0].object;
      this.gestureStarted = true; // Set the gesture started flag

      // Position the movement planes at the intersection point
      const intersectionPoint = intersects[0].point;
      this.movementPlaneXZ.set(new Vector3(0, 1, 0), intersectionPoint.y);
      this.movementPlaneY.setFromNormalAndCoplanarPoint(
        new Vector3(1, 0, 0),
        intersectionPoint
      );

      // Set initial points and original position
      this.initialPoint.copy(intersectionPoint);
      this.lastPoint.copy(intersectionPoint);
      this.originalPosition.copy(this.currentGestureObject.position);

      console.log(
        "Pointer down on gesture-enabled object",
        this.currentGestureObject
      );
      console.log("Initial Point:", this.initialPoint);
      console.log("Original Position:", this.originalPosition);
      this.onGestureStart?.();
    } else {
      // Otherwise, enable camera controls
      this.cameraControls.enabled = true;
      this.currentGestureObject = null;
      this.gestureStarted = false; // Reset the gesture started flag
      console.log("Pointer down on non-gesture area");
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

        // Update the pointer variable for raycasting
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Perform raycasting to detect the new intersection points
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Handle drag progress logic here
        const intersectionPointXZ = new Vector3();
        const intersectionPointY = new Vector3();

        this.raycaster.ray.intersectPlane(
          this.movementPlaneXZ,
          intersectionPointXZ
        );
        this.raycaster.ray.intersectPlane(
          this.movementPlaneY,
          intersectionPointY
        );

        // Construct the current point from XZ intersections (ignoring Y for now)
        const currentPoint = new Vector3(
          intersectionPointXZ.x,
          this.initialPoint.y,
          intersectionPointXZ.z
        );

        const delta = currentPoint.clone().sub(this.initialPoint);

        console.log("Intersection Point XZ:", intersectionPointXZ);
        console.log("Intersection Point Y:", intersectionPointY);
        console.log("Delta:", delta);

        // Pass the detailed drag progress data to the handler
        this.onDragProgress?.({
          initialPoint: this.initialPoint.clone(),
          lastPoint: this.lastPoint.clone(),
          currentPoint: currentPoint.clone(),
          delta: delta.clone(),
          originalPosition: this.originalPosition.clone(),
          object: this.currentGestureObject,
        });

        // Update the last point
        this.lastPoint.copy(currentPoint);
      }
    }
  }
}

export default GestureManager;
