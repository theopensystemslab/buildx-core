import { Camera, Object3D, Raycaster, Vector2 } from "three";

class GestureManager {
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private domElement: HTMLElement;
  private domRect: DOMRect;
  private camera: Camera;
  private gestureEnabledObjects: Object3D[];

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
      "pointermove",
      this.onPointerMove.bind(this)
    );
    window.addEventListener("resize", this.onResize.bind(this));
  }

  private onResize() {
    this.domRect = this.domElement.getBoundingClientRect();
  }

  private onPointerMove(event: PointerEvent) {
    // Update pointer position
    this.pointer.x =
      ((event.clientX - this.domRect.left) / this.domRect.width) * 2 - 1;
    this.pointer.y =
      -((event.clientY - this.domRect.top) / this.domRect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.gestureEnabledObjects,
      true
    );

    if (intersects.length > 0) {
      console.log("Hovering over:", intersects[0].object);
    }
  }

  setCamera(newCamera: Camera) {
    this.camera = newCamera;
  }

  setGestureEnabledObjects(newObjects: Object3D[]) {
    this.gestureEnabledObjects = newObjects;
  }

  dispose() {
    this.domElement.removeEventListener(
      "pointermove",
      this.onPointerMove.bind(this)
    );
    window.removeEventListener("resize", this.onResize.bind(this));
    this.gestureEnabledObjects = [];
  }
}

export default GestureManager;
