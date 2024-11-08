import CameraControls from "camera-controls";
import * as dat from "dat.gui";
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three-stdlib";
import { OutlinePass } from "three-stdlib";
import { RenderPass } from "three-stdlib";
import OutlineManager from "./OutlineManager";
import { SceneContextModeLabel } from "@/three/managers/ContextManager";

class SceneWithGui extends Scene {
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  clock: Clock;
  outlineManager: OutlineManager;
  private gui: dat.GUI;
  private composer: EffectComposer;

  constructor() {
    super();
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.clock = new Clock();
    this.cameraControls = this.createCameraControls();
    this.composer = this.createComposer();
    this.outlineManager = this.createOutlineManager();
    this.gui = this.createGui();

    this.setupLights();
    this.setupEventListeners();
  }

  private createRenderer(): WebGLRenderer {
    const renderer = new WebGLRenderer();
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

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this, this.camera);
    composer.addPass(renderPass);

    const outlinePass = new OutlinePass(
      new Vector2(window.innerWidth, window.innerHeight),
      this,
      this.camera
    );
    outlinePass.visibleEdgeColor.set("#ff0000");
    outlinePass.edgeStrength = 3;
    composer.addPass(outlinePass);

    return composer;
  }

  private createOutlineManager(): OutlineManager {
    const outlinePass = this.composer.passes[1] as OutlinePass;
    return new OutlineManager(outlinePass);
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
  }

  public animate(): void {
    const delta = this.clock.getDelta();
    this.cameraControls.update(delta);

    requestAnimationFrame(this.animate.bind(this));
    this.composer.render();
  }

  public dispose(): void {
    this.gui.destroy();
    this.outlineManager.dispose();
    window.removeEventListener("resize", this.handleResize);
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
}

export default SceneWithGui;
