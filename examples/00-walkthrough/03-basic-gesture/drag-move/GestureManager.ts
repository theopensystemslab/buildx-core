import { Camera, Object3D, Plane, Raycaster, Vector2, Vector3 } from "three";

export type DragDetail = {
  initialPoint: Vector3;
  currentPoint: Vector3;
  delta: Vector3;
  object: Object3D | null;
};

class GestureManager {
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private domElement: HTMLElement;
  private camera: Camera;
  private gestureEnabledObjects: Object3D[];
  private domRect: DOMRect;
  private isDragging = false;
  private currentObject: Object3D | null = null;
  private dragPlane = new Plane(new Vector3(0, 1, 0), 0);
  private initialPoint = new Vector3();
  private lastPoint = new Vector3();

  constructor(params: {
    domElement: HTMLElement;
    camera: Camera;
    gestureEnabledObjects?: Object3D[];
  }) {
    this.domElement = params.domElement;
    this.camera = params.camera;
    this.gestureEnabledObjects = params.gestureEnabledObjects ?? [];
    this.domRect = this.domElement.getBoundingClientRect();

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
    window.addEventListener("resize", this.onResize.bind(this));
  }

  private onResize() {
    this.domRect = this.domElement.getBoundingClientRect();
  }

  private updatePointer(event: PointerEvent) {
    this.pointer.x =
      ((event.clientX - this.domRect.left) / this.domRect.width) * 2 - 1;
    this.pointer.y =
      -((event.clientY - this.domRect.top) / this.domRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private onPointerDown(event: PointerEvent) {
    this.updatePointer(event);
    const intersects = this.raycaster.intersectObjects(
      this.gestureEnabledObjects
    );

    if (intersects.length > 0) {
      this.isDragging = true;
      this.currentObject = intersects[0].object;

      // Set up drag plane at intersection point
      this.dragPlane.setFromNormalAndCoplanarPoint(
        new Vector3(0, 1, 0),
        intersects[0].point
      );

      this.initialPoint.copy(intersects[0].point);
      this.lastPoint.copy(intersects[0].point);
    }
  }

  private onPointerMove(event: PointerEvent) {
    if (!this.isDragging || !this.currentObject) return;

    this.updatePointer(event);

    const intersectionPoint = new Vector3();
    const hasIntersection = this.raycaster.ray.intersectPlane(
      this.dragPlane,
      intersectionPoint
    );

    if (hasIntersection) {
      const delta = intersectionPoint.clone().sub(this.lastPoint);
      this.currentObject.position.add(delta);
      this.lastPoint.copy(intersectionPoint);
    }
  }

  private onPointerUp() {
    this.isDragging = false;
    this.currentObject = null;
  }

  enableGesturesOnObject(object: Object3D) {
    this.gestureEnabledObjects.push(object);
  }

  dispose() {
    this.domElement.removeEventListener(
      "pointerdown",
      this.onPointerDown.bind(this)
    );
    this.domElement.removeEventListener(
      "pointerup",
      this.onPointerUp.bind(this)
    );
    this.domElement.removeEventListener(
      "pointermove",
      this.onPointerMove.bind(this)
    );
    window.removeEventListener("resize", this.onResize.bind(this));
    this.gestureEnabledObjects = [];
  }
}

export default GestureManager;
