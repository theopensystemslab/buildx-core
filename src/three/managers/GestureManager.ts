import { A, O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import {
  Raycaster,
  Vector2,
  Vector3,
  Object3D,
  Plane,
  Intersection,
  Camera,
} from "three";

type TapHandler = (intersection: Intersection, pointer: Vector2) => void;

type DragHandler = (detail: DragDetail) => void;

type DragDetail = {
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
  private camera: Camera;
  private pointerDownTime = 0;
  private pointerIsDown = false;
  private pointerMoved = false;
  private tapTimeoutId: NodeJS.Timeout | null = null;
  private longTapTimeoutId: NodeJS.Timeout | null = null;
  private doubleTapThreshold = 300; // milliseconds
  private longTapThreshold = 500; // milliseconds
  private dragThreshold = 1; // pixels
  private initialPointerPosition = new Vector2();
  private initialPoint = new Vector3();
  private lastPoint = new Vector3();
  private isDraggingGestureEnabledObject = false;
  private currentGestureObject: Object3D | null = null;
  private isLongTapOnGestureObject = false;
  private tapCount = 0;
  private domElement: HTMLElement;
  private domRect: DOMRect;
  private onGestureStart?: () => void;
  private onGestureEnd?: () => void;
  private onSingleTap?: TapHandler;
  private onDoubleTap?: TapHandler;
  private onLongTap?: TapHandler;
  private onTapMissed?: () => void;
  private onDragStart?: TapHandler;
  private onDragProgress?: DragHandler;
  private onDragEnd?: TapHandler;
  private onRightClick?: TapHandler;
  private gestureStarted = false; // Flag to track if a gesture has actually started
  private movementPlaneXZ = new Plane(new Vector3(0, 1, 0), 0); // The plane for XZ tracking
  private movementPlaneY = new Plane(new Vector3(1, 0, 0), 0); // The plane for Y tracking
  private originalPosition = new Vector3(); // Original position of the object being dragged

  constructor(params: {
    domElement: HTMLElement;
    camera: Camera;
    gestureEnabledObjects?: Object3D[];
    onGestureStart?: () => void;
    onGestureEnd?: () => void;
    onSingleTap?: TapHandler;
    onDoubleTap?: TapHandler;
    onLongTap?: TapHandler;
    onTapMissed?: () => void;
    onDragStart?: TapHandler;
    onDragProgress?: DragHandler;
    onDragEnd?: TapHandler;
    onRightClick?: TapHandler;
  }) {
    this.domElement = params.domElement;
    this.camera = params.camera;
    this.gestureEnabledObjects = params.gestureEnabledObjects ?? [];
    this.domRect = this.domElement.getBoundingClientRect();

    this.onGestureStart = params.onGestureStart;
    this.onGestureEnd = params.onGestureEnd;
    this.onSingleTap = params.onSingleTap;
    this.onDoubleTap = params.onDoubleTap;
    this.onLongTap = params.onLongTap;
    this.onTapMissed = params.onTapMissed;
    this.onDragStart = params.onDragStart;
    this.onDragProgress = params.onDragProgress;
    this.onDragEnd = params.onDragEnd;

    this.onRightClick = params.onRightClick;

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
    this.domElement.addEventListener(
      "contextmenu",
      this.onContextMenu.bind(this)
    );
    window.addEventListener("resize", this.onResize.bind(this));
  }

  private onResize() {
    this.domRect = this.domElement.getBoundingClientRect();
  }

  private onContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    const intersects = this.raycaster.intersectObjects(
      this.gestureEnabledObjects
    );

    if (intersects.length > 0) {
      const intersection = intersects[0];
      this.onRightClick?.(intersection, this.pointer);
    }
  }

  private onPointerDown(event: PointerEvent) {
    this.pointerIsDown = true;
    this.pointerMoved = false;
    this.isDraggingGestureEnabledObject = false;
    this.isLongTapOnGestureObject = false;
    this.pointerDownTime = performance.now();
    this.initialPointerPosition.set(event.clientX, event.clientY);
    this.pointer.x =
      ((event.clientX - this.domRect.left) / this.domRect.width) * 2 - 1;
    this.pointer.y =
      -((event.clientY - this.domRect.top) / this.domRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.gestureEnabledObjects
    );

    if (intersects.length > 0) {
      this.isDraggingGestureEnabledObject = true;
      this.isLongTapOnGestureObject = true;
      this.currentGestureObject = intersects[0].object;
      this.gestureStarted = true; // Set the gesture started flag
      const intersectionPoint = intersects[0].point;
      this.movementPlaneXZ.setFromNormalAndCoplanarPoint(
        new Vector3(0, 1, 0),
        intersectionPoint
      );
      this.movementPlaneY.setFromNormalAndCoplanarPoint(
        new Vector3(1, 0, 0),
        intersectionPoint
      );
      this.initialPoint.copy(intersectionPoint);
      this.lastPoint.copy(intersectionPoint);
      this.originalPosition.copy(this.currentGestureObject.position);

      this.onGestureStart?.();
    } else {
      this.currentGestureObject = null;
      this.gestureStarted = false; // Reset the gesture started flag
    }
    this.longTapTimeoutId = setTimeout(() => {
      if (!this.pointerMoved && this.isLongTapOnGestureObject) {
        this.currentGestureObject &&
          pipe(
            this.raycaster.intersectObject(this.currentGestureObject),
            A.head,
            O.map((ix) => this.onLongTap?.(ix, this.pointer))
          );
      }
    }, this.longTapThreshold);
  }

  private onPointerUp(_event: PointerEvent) {
    const pointerUpTime = performance.now();
    const duration = pointerUpTime - this.pointerDownTime;
    if (this.longTapTimeoutId) {
      clearTimeout(this.longTapTimeoutId);
      this.longTapTimeoutId = null;
    }

    if (
      this.pointerMoved &&
      this.isDraggingGestureEnabledObject &&
      this.currentGestureObject
    ) {
      pipe(
        this.raycaster.intersectObject(this.currentGestureObject),
        A.head,
        O.map((ix) => this.onDragEnd?.(ix, this.pointer))
      );
    } else if (!this.pointerMoved) {
      if (duration < this.longTapThreshold) {
        this.tapCount++;
        if (this.tapCount === 1) {
          this.currentGestureObject &&
            pipe(
              this.raycaster.intersectObject(this.currentGestureObject),
              A.head,
              O.map((ix) => this.onSingleTap?.(ix, this.pointer))
            );
          this.tapTimeoutId = setTimeout(() => {
            this.tapCount = 0;
          }, this.doubleTapThreshold);
        } else if (this.tapCount === 2) {
          if (this.tapTimeoutId) {
            clearTimeout(this.tapTimeoutId);
            this.tapTimeoutId = null;
          }

          this.currentGestureObject &&
            pipe(
              this.raycaster.intersectObject(this.currentGestureObject),
              A.head,
              O.map((ix) => this.onDoubleTap?.(ix, this.pointer))
            );

          this.tapCount = 0;
        }
      }
      if (!this.gestureStarted && this.tapCount === 1) {
        this.onTapMissed?.();
      }
    }

    this.pointerIsDown = false;
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
        if (!this.pointerMoved && this.currentGestureObject) {
          pipe(
            this.raycaster.intersectObject(this.currentGestureObject),
            A.head,
            O.map((ix) => this.onDragStart?.(ix, this.pointer))
          );
        }
        this.pointerMoved = true;

        if (this.longTapTimeoutId) {
          clearTimeout(this.longTapTimeoutId);
          this.longTapTimeoutId = null;
        }

        this.pointer.x =
          ((event.clientX - this.domRect.left) / this.domRect.width) * 2 - 1;
        this.pointer.y =
          -((event.clientY - this.domRect.top) / this.domRect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const intersectionPointXZ = new Vector3();
        const intersectionPointY = new Vector3();

        const intersectXZ = this.raycaster.ray.intersectPlane(
          this.movementPlaneXZ,
          intersectionPointXZ
        );
        const intersectY = this.raycaster.ray.intersectPlane(
          this.movementPlaneY,
          intersectionPointY
        );

        if (intersectXZ && intersectY) {
          const currentPoint = new Vector3(
            intersectionPointXZ.x,
            this.initialPoint.y,
            intersectionPointXZ.z
          );
          const delta = currentPoint.clone().sub(this.lastPoint);

          this.onDragProgress?.({
            initialPoint: this.initialPoint.clone(),
            lastPoint: this.lastPoint.clone(),
            currentPoint: currentPoint.clone(),
            delta: delta.clone(),
            originalPosition: this.originalPosition.clone(),
            object: this.currentGestureObject,
          });

          this.lastPoint.copy(currentPoint);
        }
      }
    }
  }

  setCamera(newCamera: Camera) {
    this.camera = newCamera;
  }

  setGestureEnabledObjects(newObjects: Object3D[]) {
    this.gestureEnabledObjects = newObjects;
  }

  enableGesturesOnObject(object: Object3D) {
    this.gestureEnabledObjects.push(object);
  }

  disableGesturesOnObject(object: Object3D) {
    this.gestureEnabledObjects = this.gestureEnabledObjects.filter(
      (obj) => obj !== object
    );
  }
}

export default GestureManager;
