import CameraControls from "camera-controls";
import {
  AmbientLight,
  Box3,
  Clock,
  DirectionalLight,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Sphere,
  Spherical,
  // Subset for camera-controls
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import GUIManager, { GUIConfig } from "./GUIManager";

// Create subset of THREE for camera-controls
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

// Initialize camera-controls with subset
CameraControls.install({ THREE: subsetOfTHREE });

class SceneWithGui extends Scene {
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  clock: Clock;
  private guiManager?: GUIManager<any>;

  constructor() {
    super();
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.clock = new Clock();
    this.cameraControls = this.createCameraControls();

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
    return new PerspectiveCamera(
      75, // standard FOV
      window.innerWidth / window.innerHeight,
      0.1, // near plane
      1000 // far plane
    );
  }

  private createCameraControls(): CameraControls {
    const controls = new CameraControls(this.camera, this.renderer.domElement);

    // Set initial camera position and target
    const initialPosition = { x: 10, y: 10, z: 10 };
    const target = { x: 0, y: 0, z: 0 };
    const distance = 15;

    controls.setLookAt(
      initialPosition.x,
      initialPosition.y,
      initialPosition.z,
      target.x,
      target.y,
      target.z,
      true
    );
    controls.dollyTo(distance, true);

    return controls;
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
    this.renderer.render(this, this.camera);
  }

  public initializeGUI<T>(config: GUIConfig<T>): void {
    // Clean up existing GUI if any
    if (this.guiManager) {
      this.guiManager.dispose();
    }

    // Create new GUI manager
    this.guiManager = new GUIManager<T>(this, config);
  }

  public dispose(): void {
    this.guiManager?.dispose();
    window.removeEventListener("resize", this.handleResize);
    this.renderer.dispose();
  }

  private handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}

export default SceneWithGui;
