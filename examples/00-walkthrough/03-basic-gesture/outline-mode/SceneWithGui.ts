import { SceneContextModeLabel } from "@/three/managers/ContextManager";
import CameraControls from "camera-controls";
import * as dat from "dat.gui";
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import { EffectComposer, OutlinePass, RenderPass } from "three-stdlib";
import { GUIConfig, GUIManager } from "./GUIManager";
import OutlineManager from "./OutlineManager";

class SceneWithGui extends Scene {
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  clock: Clock;
  outlineManager: OutlineManager;
  private outlineModeGui: dat.GUI;
  private composer: EffectComposer;
  private outlinePass: OutlinePass;
  private guiManagers: GUIManager<any>[] = [];
  private raycaster: Raycaster;
  private mouse: Vector2;

  constructor() {
    super();
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.clock = new Clock();
    this.cameraControls = this.createCameraControls();
    this.outlinePass = this.createOutlinePass();
    this.composer = this.createComposer();
    this.outlineManager = this.createOutlineManager();
    this.outlineModeGui = this.createGui();
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    this.setupLights();
    this.setupEventListeners();
  }

  private createRenderer(): WebGLRenderer {
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    return renderer;
  }

  private createCamera(): PerspectiveCamera {
    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    return camera;
  }

  private createCameraControls(): CameraControls {
    const controls = new CameraControls(this.camera, this.renderer.domElement);
    controls.setLookAt(10, 10, 10, 0, 0, 0, true);
    controls.dollyTo(15, true);
    return controls;
  }

  private createOutlinePass(): OutlinePass {
    this.outlinePass = new OutlinePass(
      new Vector2(window.innerWidth, window.innerHeight),
      this,
      this.camera
    );
    this.outlinePass.visibleEdgeColor.set("#ff0000");
    this.outlinePass.edgeStrength = 3;

    return this.outlinePass;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this, this.camera);
    composer.addPass(renderPass);

    composer.addPass(this.outlinePass);

    return composer;
  }

  private createOutlineManager(): OutlineManager {
    return new OutlineManager(this.outlinePass);
  }

  private createGui(): dat.GUI {
    const gui = new dat.GUI();
    const params = {
      mode: "SITE" as SceneContextModeLabel,
    };

    gui
      .add(params, "mode", ["SITE", "BUILDING", "ROW"])
      .onChange((mode: SceneContextModeLabel) => {
        this.outlineManager.setMode(mode);
      });

    return gui;
  }

  private setupLights(): void {
    const ambientLight = new AmbientLight(0xffffff, 0.5);
    this.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.add(directionalLight);
  }

  private setupEventListeners(): void {
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("mousemove", this.handleMouseMove);
  }

  private handleMouseMove = (event: MouseEvent) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.children, true);

    if (intersects.length > 0) {
      this.outlineManager.setHoveredObject(intersects[0].object);
    } else {
      this.outlineManager.setHoveredObject(null);
    }
  };

  public animate(): void {
    const delta = this.clock.getDelta();
    this.cameraControls.update(delta);

    requestAnimationFrame(this.animate.bind(this));
    this.composer.render();
  }

  public dispose(): void {
    this.guiManagers.forEach((manager) => manager.dispose());
    this.outlineModeGui.destroy();
    this.outlineManager.dispose();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("mousemove", this.handleMouseMove);
    this.renderer.dispose();
  }

  private handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  public initializeGUI<T>(config: GUIConfig<T>) {
    const manager = new GUIManager(this, config);
    this.guiManagers.push(manager);
  }
}

export default SceneWithGui;
