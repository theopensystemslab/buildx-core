import { Y_LAYER_1, Y_LAYER_2, Y_LAYER_3 } from "@/constants";
import { House } from "@/data/user/houses";
import {
  AbstractXStretchManager,
  AbstractZStretchManager,
} from "@/three/managers/stretch/AbstractStretchManagers";
import ContextManager, {
  SceneContextMode,
} from "@/three/managers/ContextManager";
import GestureManager, { DragDetail } from "@/three/managers/GestureManager";
import OutlineManager from "@/three/managers/OutlineManager";
import CameraControls from "camera-controls";
import { Polygon } from "geojson";
import {
  AmbientLight,
  AxesHelper,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Clock,
  DirectionalLight,
  DoubleSide,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  ShadowMaterial,
  Sphere,
  Spherical,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import {
  EffectComposer,
  FXAAShader,
  OutlinePass,
  RenderPass,
  ShaderPass,
} from "three-stdlib";
// @ts-ignore
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";
import { createOutlinePass } from "../../effects/outline";
import RotateHandleMesh from "../handles/RotateHandleMesh";
import StretchHandleBrush from "../handles/StretchHandleMesh";
import { ElementBrush } from "../house/ElementGroup";
import { HouseGroup } from "../house/HouseGroup";
import { ScopeElement } from "../types";
import SiteBoundary from "./SiteBoundary";

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

export const defaultCamPos: [number, number, number] = [-12, 24, -12];

const getDefaultContainer = () => {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.top = "0";
  container.style.left = "0";
  document.body.appendChild(container);
  return container;
};

type BuildXSceneConfig = {
  canvas?: HTMLCanvasElement;
  enableGestures?: boolean;
  enableOutlining?: boolean;
  enableLighting?: boolean;
  enableAxesHelper?: boolean;
  enableGroundObjects?: boolean;
  enableShadows?: boolean;
  antialias?: boolean;
  cameraOpts?: {
    dollyToCursor?: boolean;
    invertDolly?: boolean;
  };
  onLongTapBuildElement?: (scopeElement: ScopeElement, xy: Vector2) => void;
  onRightClickBuildElement?: (scopeElement: ScopeElement, xy: Vector2) => void;
  onTapMissed?: () => void;
  onFocusHouse?: (houseId: string) => void;
  onFocusRow?: (houseId: string, rowIndex: number) => void;
  onHouseCreate?: (house: House) => void;
  onHouseUpdate?: (houseId: string, change: Partial<House>) => void;
  onHouseDelete?: (houseId: string) => void;
  onModeChange?: (prev: SceneContextMode, next: SceneContextMode) => void;
  container?: HTMLElement;
  orbitMode?: boolean;
  orbitSpeed?: number;
};

class BuildXScene extends Scene {
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  clock: Clock;
  composer: EffectComposer;
  outlinePass: OutlinePass;

  onHouseCreate?: BuildXSceneConfig["onHouseCreate"];
  onHouseUpdate?: BuildXSceneConfig["onHouseUpdate"];
  onHouseDelete?: BuildXSceneConfig["onHouseDelete"];

  gestureManager?: GestureManager;
  contextManager?: ContextManager;
  outlineManager?: OutlineManager;

  siteBoundary: SiteBoundary | null;

  private container: HTMLElement;

  private animationFrameId: number | null = null;

  private orbitMode: boolean;
  private orbitSpeed: number;

  constructor(config: BuildXSceneConfig = {}) {
    super();

    this.siteBoundary = null;

    const {
      container = getDefaultContainer(),
      canvas,
      enableGestures = true,
      enableOutlining = true,
      enableLighting = true,
      enableAxesHelper = false,
      enableGroundObjects = true,
      enableShadows = true,
      antialias = true,
      onLongTapBuildElement,
      onRightClickBuildElement,
      // onFocusHouse,
      // onFocusRow,
      onTapMissed,
      onHouseCreate,
      onHouseUpdate,
      onHouseDelete,
      onModeChange,
      cameraOpts = {},
      orbitMode = false,
      orbitSpeed = 0.05,
    } = config;

    this.container = container;

    this.onHouseCreate = onHouseCreate;
    this.onHouseUpdate = onHouseUpdate;
    this.onHouseDelete = onHouseDelete;

    this.clock = new Clock();

    this.contextManager = new ContextManager({
      onModeChange,
    });

    const camera = new PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      1000
    );

    this.renderer = new WebGLRenderer({ canvas, antialias });
    if (enableShadows) this.renderer.shadowMap.enabled = true;

    if (!canvas) {
      container.appendChild(this.renderer.domElement);
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor("white");

    this.cameraControls = new CameraControls(camera, this.renderer.domElement);

    this.resetCamera();

    const { dollyToCursor = true, invertDolly = false } = cameraOpts;

    this.cameraControls.dollyToCursor = dollyToCursor;
    this.cameraControls.dollySpeed = invertDolly ? -1.0 : 1.0;

    if (enableLighting) {
      this.enableLighting();
    }

    if (enableAxesHelper) {
      const axesHelper = new AxesHelper();
      this.add(axesHelper);
    }

    if (enableGroundObjects) {
      this.enableGroundObjects();
    }

    let dragProgress: ((dragDetail: DragDetail) => void) | undefined =
        undefined,
      dragEnd: (() => void) | undefined = undefined;

    if (enableGestures)
      this.gestureManager = new GestureManager({
        domElement: this.renderer.domElement,
        camera,
        scene: this,
        enableOutlining,
        onGestureStart: () => {
          this.cameraControls.enabled = false;
        },
        onGestureEnd: () => {
          this.cameraControls.enabled = true;
        },
        onDoubleTap: ({ object }) => {
          if (object instanceof ElementBrush) {
            this.contextManager?.contextDown(object.elementGroup);
          }
        },
        onSingleTap: ({ object }) => {
          if (object instanceof ElementBrush) {
            this.contextManager?.setSelectedHouse(
              object.elementGroup.houseGroup
            );
          }
        },
        onLongTap: ({ object }, pointer) => {
          if (object instanceof ElementBrush) {
            onLongTapBuildElement?.(object.scopeElement, pointer);
          }
        },
        onRightClick: ({ object }, pointer) => {
          if (object instanceof ElementBrush) {
            onRightClickBuildElement?.(object.scopeElement, pointer);
          }
        },
        onDragStart: ({ object, point: currentPoint }) => {
          switch (true) {
            case object instanceof StretchHandleBrush: {
              const stretchManager = object.manager;
              stretchManager.gestureStart(object.side);

              const yAxis = new Vector3(0, 1, 0);

              dragProgress = ({ delta }: DragDetail) => {
                // REVIEW: whether to normalize here or in the manager
                const normalizedDelta = delta
                  .clone()
                  .applyAxisAngle(yAxis, -stretchManager.houseGroup.rotation.y);

                if (stretchManager instanceof AbstractZStretchManager) {
                  stretchManager.gestureProgress(normalizedDelta.z);
                }

                if (stretchManager instanceof AbstractXStretchManager) {
                  stretchManager.gestureProgress(normalizedDelta.x);
                }
              };

              dragEnd = () => {
                stretchManager.gestureEnd();
                dragProgress = undefined;
              };
              return;
            }

            case object instanceof ElementBrush: {
              if (this.contextManager?.siteMode) {
                const houseGroup = object.houseGroup;

                this.contextManager.setSelectedHouse(houseGroup);

                houseGroup.managers.move?.gestureStart();

                dragProgress = ({ delta }: DragDetail) => {
                  houseGroup.managers.move?.gestureProgress(delta);
                };

                dragEnd = () => {
                  dragProgress = undefined;

                  const {
                    userData: { houseId },
                    position,
                  } = houseGroup;

                  houseGroup.hooks?.onHouseUpdate?.(houseId, { position });
                  houseGroup.updateBBs();
                };
              }
              return;
            }

            case object instanceof RotateHandleMesh: {
              const rotateManager = object.houseGroup.managers.rotate;
              if (!rotateManager) return;

              rotateManager.initGesture(currentPoint);

              dragProgress = ({ currentPoint }: DragDetail) => {
                rotateManager.gestureProgress(currentPoint);
              };

              dragEnd = () => {
                rotateManager.gestureEnd();
                dragProgress = undefined;
              };
              return;
            }
          }
        },
        onDragProgress: (v) => dragProgress?.(v),
        onDragEnd: () => dragEnd?.(),
        onTapMissed,
      });

    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this, camera);
    this.composer.addPass(renderPass);

    this.outlinePass = createOutlinePass(this, camera);
    this.composer.addPass(this.outlinePass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // FXAA after output pass (following Three.js examples)
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms["resolution"].value.x =
      1 / (container.clientWidth * window.devicePixelRatio);
    fxaaPass.material.uniforms["resolution"].value.y =
      1 / (container.clientHeight * window.devicePixelRatio);
    this.composer.addPass(fxaaPass);

    this.outlineManager = new OutlineManager(this, this.outlinePass);

    this.orbitMode = orbitMode;
    this.orbitSpeed = orbitSpeed;

    if (this.orbitMode) {
      this.enableOrbitMode();
    }

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());

    this.animate();
  }

  updatePolygon(polygon: Polygon | null) {
    if (this.siteBoundary !== null) {
      this.siteBoundary.removeFromParent();
    }
    if (polygon !== null) {
      this.siteBoundary = new SiteBoundary(polygon);
      this.siteBoundary.position.set(0, 0.1, 0);
      this.addObject(this.siteBoundary, { gestures: false });
    }
  }

  enableLighting() {
    const ambientLight = new AmbientLight(0xffffff, 1.25);
    this.add(ambientLight);

    const shadowLight = new DirectionalLight(0xffffff, 2.25);
    shadowLight.position.set(0, 150, -150);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;
    shadowLight.shadow.camera.far = 300;
    shadowLight.shadow.camera.left = -30.5;
    shadowLight.shadow.camera.right = 30.5;
    shadowLight.shadow.camera.top = 21.5;
    shadowLight.shadow.camera.bottom = -21.5;
    this.add(shadowLight);

    // // Add DirectionalLightHelper
    // const lightHelper = new DirectionalLightHelper(shadowLight, 10);
    // this.add(lightHelper);
  }

  resetCamera() {
    this.cameraControls.setLookAt(...defaultCamPos, 0, 0, 0);
  }

  enableGroundObjects() {
    // GroundCircle
    const groundCircleGeometry = new CircleGeometry(500, 32);
    const groundCircleMaterial = new MeshBasicMaterial({
      side: DoubleSide,
      color: 0xdddddd,
    });
    const groundCircle = new Mesh(groundCircleGeometry, groundCircleMaterial);
    groundCircle.position.set(0, -Y_LAYER_3, 0);
    groundCircle.rotation.set(-Math.PI / 2, 0, 0);
    this.add(groundCircle);

    // ShadowPlane
    const shadowPlaneGeometry = new PlaneGeometry(100, 100);
    const shadowPlaneMaterial = new ShadowMaterial({
      color: 0x555555,
      side: DoubleSide,
    });
    const shadowPlane = new Mesh(shadowPlaneGeometry, shadowPlaneMaterial);
    shadowPlane.position.set(0, -Y_LAYER_2, 0);
    shadowPlane.rotation.set(-Math.PI / 2, 0, 0);
    shadowPlane.receiveShadow = true;
    this.add(shadowPlane);

    // RectangularGrid
    const xAxis = { cells: 61, size: 1 };
    const zAxis = { cells: 61, size: 1 };
    const color = 0x000000;
    const opacity = 0.18;

    const gridGeometry = new BufferGeometry();
    const vertices: number[][] = [];
    const halfX = (xAxis.size * xAxis.cells) / 2;
    const halfZ = (zAxis.size * zAxis.cells) / 2;

    for (let i = 0; i <= xAxis.cells; i++) {
      const x = i * xAxis.size - halfX;
      vertices.push([x, 0, -halfZ], [x, 0, halfZ]);
    }

    for (let i = 0; i <= zAxis.cells; i++) {
      const z = i * zAxis.size - halfZ;
      vertices.push([-halfX, 0, z], [halfX, 0, z]);
    }

    gridGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(vertices.flat()), 3)
    );

    const gridMaterial = new LineBasicMaterial({
      color,
      opacity,
      transparent: true,
    });

    const rectangularGrid = new LineSegments(gridGeometry, gridMaterial);
    rectangularGrid.position.set(0, -Y_LAYER_1, 0);

    this.add(rectangularGrid);
  }

  animate() {
    const delta = this.clock.getDelta();

    if (this.orbitMode) {
      // Calculate new position using CAMERA_DISTANCE to maintain fixed radius
      const [x0, y, z0] = defaultCamPos;
      const angle = this.clock.getElapsedTime() * this.orbitSpeed;
      const x = Math.cos(angle) * x0 * 2;
      const z = Math.sin(angle) * z0 * 2;

      // Update camera position, maintaining the same height
      this.cameraControls.setLookAt(
        x,
        y, // Use fixed height instead of pos.y
        z,
        0,
        0,
        0,
        true // Force immediate update
      );
    }

    this.cameraControls.update(delta);
    this.composer.render();
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (this.cameraControls.camera instanceof PerspectiveCamera) {
      this.cameraControls.camera.aspect = width / height;
    }
    this.cameraControls.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  addObject(object: Object3D, options?: { gestures: boolean }) {
    const { gestures = false } = options ?? {};

    this.add(object);

    if (gestures) {
      this.gestureManager?.enableGesturesOnObject(object);
    }
  }

  addHouseGroup(houseGroup: HouseGroup, options?: { collisions: boolean }) {
    const { collisions = false } = options ?? {};

    this.gestureManager?.enableGesturesOnObject(houseGroup);

    const { onHouseCreate, onHouseUpdate, onHouseDelete } = this;

    houseGroup.hooks = {
      onHouseCreate: onHouseCreate,
      onHouseUpdate: onHouseUpdate,
      onHouseDelete: onHouseDelete,
    };

    this.add(houseGroup);

    if (collisions && houseGroup.managers.collisions) {
      houseGroup.managers.collisions.updateNearNeighbours();

      if (houseGroup.managers.collisions.checkCollisions()) {
        const MAX_T = 99;
        let t = 0; // parameter for the spiral
        let a = 1; // tightness of the spiral, might need adjustment

        do {
          // Calculate the new position on the spiral
          const x = a * t * Math.cos(t);
          const z = a * t * Math.sin(t);

          // Move the houseTransformsGroup to new position
          houseGroup.position.set(x, 0, z);
          houseGroup.updateBBs();

          t += 1; // Increment t by an amount to ensure the loop can exit
        } while (t < MAX_T && houseGroup.managers.collisions.checkCollisions());

        if (t >= MAX_T) throw new Error(`Infinite collision!`);
      }
      houseGroup.updateDB();
    }

    houseGroup.hooks.onHouseCreate?.(houseGroup.house);
  }

  addHouseType() {}

  get houses(): HouseGroup[] {
    return this.children.filter(
      (x): x is HouseGroup => x instanceof HouseGroup
    );
  }

  dispose() {
    // Cancel animation frame first
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // First, clean up managers
    if (this.gestureManager) {
      this.gestureManager.dispose();
      this.gestureManager = undefined;
    }

    if (this.outlineManager) {
      this.outlineManager.dispose();
      this.outlineManager = undefined;
    }

    // Then clean up scene objects
    this.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    // Clean up composer and its passes
    if (this.composer) {
      // Clean up passes first
      this.composer.passes.forEach((pass) => {
        if ("dispose" in pass && typeof pass.dispose === "function") {
          pass.dispose();
        }
      });

      // Clear the passes array
      this.composer.passes = [];
    }

    this.renderer.dispose();
    window.removeEventListener("resize", this.handleResize.bind(this));
  }

  private enableOrbitMode() {
    // Disable normal camera controls
    this.cameraControls.enabled = false;

    // Position camera at a fixed point
    this.cameraControls.setLookAt(
      ...defaultCamPos,
      0,
      0,
      0,
      true // Force immediate update
    );
  }
}

export default BuildXScene;
