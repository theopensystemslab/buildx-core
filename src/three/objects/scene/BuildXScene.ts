import GestureManager from "@/three/managers/GestureManager";
import CameraControls from "camera-controls";
import { Object3D, Scene } from "three";

import {
  AmbientLight,
  Box3,
  Clock,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Sphere,
  Spherical,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import StretchHandleMesh from "../handles/StretchHandleMesh";
import { ElementBrush } from "../house/ElementGroup";
import { HouseGroup } from "../house/HouseGroup";

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

class BuildXScene extends Scene {
  gestureManager: GestureManager;
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  clock: Clock;

  constructor(canvas?: HTMLCanvasElement) {
    super();

    this.clock = new Clock();

    const camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );

    if (canvas) {
      this.renderer = new WebGLRenderer({ canvas });
    } else {
      this.renderer = new WebGLRenderer();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);
    }
    // renderer.setClearColor("white");

    this.cameraControls = new CameraControls(camera, this.renderer.domElement);

    const cameraDistance = 15;

    this.cameraControls.setLookAt(
      cameraDistance,
      cameraDistance,
      cameraDistance,
      0,
      0,
      0
    );
    const d = 15;

    this.cameraControls.setLookAt(d, d, d, 0, 0, 0);

    const light = new AmbientLight(0xffffff, 4);
    this.add(light);

    this.gestureManager = new GestureManager({
      domElement: this.renderer.domElement,
      camera,
      onGestureStart: () => {
        this.cameraControls.enabled = false;
      },
      onGestureEnd: () => {
        this.cameraControls.enabled = true;
      },
      onDoubleTap: ({ object }) => {
        if (object instanceof ElementBrush) {
          object.houseGroup.modeManager.down();
        }
      },
      onDragStart: ({ object }) => {
        if (object instanceof StretchHandleMesh) {
          object.manager.gestureStart(object.side);
        }
      },
      onDragProgress: ({ object }) => {
        const z = 1;
        if (object instanceof StretchHandleMesh) {
          object.manager.gestureProgress(z);
        }
      },
      onDragEnd: ({ object }) => {
        if (object instanceof StretchHandleMesh) {
          object.manager.gestureEnd();
        }
      },
    });

    this.animate();
  }

  animate() {
    const delta = this.clock.getDelta();
    this.cameraControls.update(delta);
    this.renderer.render(this, this.cameraControls.camera);
    requestAnimationFrame(() => this.animate());
  }

  addObject(object: Object3D, options?: { gestures: boolean }) {
    const { gestures = false } = options ?? {};

    this.add(object);

    if (gestures) {
      this.gestureManager.enableGesturesOnObject(object);
    }
  }

  addHouse(houseGroup: HouseGroup) {
    this.gestureManager.enableGesturesOnObject(houseGroup);
    this.add(houseGroup);
  }
}

export default BuildXScene;
