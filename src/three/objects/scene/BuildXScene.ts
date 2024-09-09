import { House } from "@/data/user/houses";
import ContextManager, {
  SceneContextMode,
} from "@/three/managers/ContextManager";
import GestureManager, { DragDetail } from "@/three/managers/GestureManager";
import XStretchManager from "@/three/managers/XStretchManager";
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
  LineDashedMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
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
import RotateHandleMesh from "../handles/RotateHandleMesh";
import StretchHandleMesh from "../handles/StretchHandleMesh";
import { ElementBrush } from "../house/ElementGroup";
import { HouseGroup } from "../house/HouseGroup";
import { ScopeElement } from "../types";
import SiteBoundary from "./SiteBoundary";
import { EffectComposer, OutlinePass, RenderPass } from "three-stdlib";
import { getOutlinePass } from "../../effects/outline";

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

type BuildXSceneConfig = {
  canvas?: HTMLCanvasElement;
  enableGestures?: boolean;
  enableLighting?: boolean;
  enableAxesHelper?: boolean;
  enableGroundObjects?: boolean;
  enableShadows?: boolean;
  cameraDistance?: number;
  antialias?: boolean;
  onLongTapBuildElement?: (scopeElement: ScopeElement, xy: Vector2) => void;
  onRightClickBuildElement?: (scopeElement: ScopeElement, xy: Vector2) => void;
  onTapMissed?: () => void;
  onFocusHouse?: (houseId: string) => void;
  onFocusRow?: (houseId: string, rowIndex: number) => void;
  onHouseCreate?: (house: House) => void;
  onHouseUpdate?: (houseId: string, change: Partial<House>) => void;
  onHouseDelete?: (houseId: string) => void;
  onModeChange?: (prev: SceneContextMode, next: SceneContextMode) => void;
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

  siteBoundary: SiteBoundary | null;

  constructor(config: BuildXSceneConfig = {}) {
    super();

    this.siteBoundary = null;

    const {
      canvas,
      enableGestures = true,
      enableLighting = true,
      enableAxesHelper = true,
      enableGroundObjects = true,
      enableShadows = true,
      cameraDistance = 15,
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
    } = config;

    this.onHouseCreate = onHouseCreate;
    this.onHouseUpdate = onHouseUpdate;
    this.onHouseDelete = onHouseDelete;

    this.clock = new Clock();

    this.contextManager = new ContextManager({
      onModeChange,
    });

    const camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );

    this.renderer = new WebGLRenderer({ canvas, antialias });
    if (enableShadows) this.renderer.shadowMap.enabled = true;

    if (!canvas) {
      document.body.appendChild(this.renderer.domElement);
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.setClearColor("white");

    this.cameraControls = new CameraControls(camera, this.renderer.domElement);

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
            case object instanceof StretchHandleMesh: {
              const stretchManager = object.manager;
              stretchManager.gestureStart(object.side);

              const yAxis = new Vector3(0, 1, 0);

              dragProgress = ({ delta }: DragDetail) => {
                // REVIEW: whether to normalize here or in the manager
                const normalizedDelta = delta
                  .clone()
                  .applyAxisAngle(yAxis, -stretchManager.houseGroup.rotation.y);
                stretchManager.gestureProgress(
                  stretchManager instanceof XStretchManager
                    ? normalizedDelta.x
                    : normalizedDelta.z
                );
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

    this.outlinePass = getOutlinePass(this, camera);
    this.composer.addPass(this.outlinePass);

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
    const intensityScale = 0.76;

    const ambientLight = new AmbientLight(0xffffff, 0.5 * intensityScale);
    this.add(ambientLight);

    const directionalLight1 = new DirectionalLight(
      "#b5d7fc",
      0.8 * intensityScale
    );
    directionalLight1.position.set(0, 20, 20);
    this.add(directionalLight1);

    const directionalLight2 = new DirectionalLight(
      "#ffffff",
      0.3 * intensityScale
    );
    directionalLight2.position.set(-20, 20, 0);
    this.add(directionalLight2);

    const directionalLight3 = new DirectionalLight(
      "#9bb9c6",
      0.3 * intensityScale
    );
    directionalLight3.position.set(20, 20, 0);
    this.add(directionalLight3);

    const shadowLight = new DirectionalLight("#fffcdb", 0.8 * intensityScale);
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
  }

  enableGroundObjects() {
    // GroundCircle
    const groundCircleGeometry = new CircleGeometry(500, 32);
    const groundCircleMaterial = new MeshStandardMaterial({
      side: DoubleSide,
      color: 0xd1d1c7,
    });
    const groundCircle = new Mesh(groundCircleGeometry, groundCircleMaterial);
    groundCircle.position.set(0, -0.04, 0);
    groundCircle.rotation.set(-Math.PI / 2, 0, 0);
    this.add(groundCircle);

    // ShadowPlane
    const shadowPlaneGeometry = new PlaneGeometry(100, 100);
    const shadowPlaneMaterial = new ShadowMaterial({
      color: 0x898989,
      side: DoubleSide,
    });
    const shadowPlane = new Mesh(shadowPlaneGeometry, shadowPlaneMaterial);
    shadowPlane.position.set(0, -0.02, 0);
    shadowPlane.rotation.set(-Math.PI / 2, 0, 0);
    shadowPlane.receiveShadow = true;
    this.add(shadowPlane);

    // RectangularGrid
    const xAxis = { cells: 61, size: 1 };
    const zAxis = { cells: 61, size: 1 };
    const color = 0x888888;
    const dashed = false;
    const opacity = 1;

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

    const gridMaterial = dashed
      ? new LineDashedMaterial({
          color,
          scale: 1,
          dashSize: 1,
          gapSize: 1,
          opacity,
          transparent: true,
        })
      : new LineBasicMaterial({
          color,
          opacity,
          transparent: true,
        });

    const rectangularGrid = new LineSegments(gridGeometry, gridMaterial);

    this.add(rectangularGrid);
  }

  animate() {
    const delta = this.clock.getDelta();
    this.cameraControls.update(delta);
    this.composer.render();
    requestAnimationFrame(() => this.animate());
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
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

  addHouseGroup(houseGroup: HouseGroup) {
    this.gestureManager?.enableGesturesOnObject(houseGroup);

    const { onHouseCreate, onHouseUpdate, onHouseDelete } = this;

    houseGroup.hooks = {
      onHouseCreate: onHouseCreate,
      onHouseUpdate: onHouseUpdate,
      onHouseDelete: onHouseDelete,
    };

    houseGroup.hooks.onHouseCreate?.(houseGroup.house);

    this.add(houseGroup);

    if (houseGroup.managers.collisions) {
      const MAX_T = 99;
      let t = 0; // parameter for the spiral
      let a = 1; // tightness of the spiral, might need adjustment

      do {
        houseGroup.managers.collisions.updateNearNeighbours();

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
  }

  addHouseType() {}

  get houses(): HouseGroup[] {
    return this.children.filter(
      (x): x is HouseGroup => x instanceof HouseGroup
    );
  }

  setOutline(objects: Object3D[] | null) {
    if (objects) {
      this.outlinePass.selectedObjects = objects;
    } else {
      this.outlinePass.selectedObjects = [];
    }
  }
}

export default BuildXScene;
