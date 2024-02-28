import CameraControls from "camera-controls";
import {
  AmbientLight,
  Box3,
  Clock,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Sphere,
  Spherical,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";

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

// Install CameraControls
CameraControls.install({ THREE: subsetOfTHREE });

interface BasicSceneComponents {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  addObjectToScene: (object: Object3D) => void;
}

function createBasicScene(canvas: HTMLCanvasElement): BasicSceneComponents {
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  const renderer = new WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const light = new AmbientLight(0xffffff); // Add ambient light
  scene.add(light);

  const cameraControls = new CameraControls(camera, canvas);
  const clock = new Clock();

  const render = (): void => {
    renderer.render(scene, camera);
  };

  // Efficient rendering on camera or scene update
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const hasCameraUpdated = cameraControls.update(delta);

    if (hasCameraUpdated) {
      render();
    }
  }

  animate(); // Start the animation loop

  // Handle window resize
  window.addEventListener("resize", (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render(); // Ensure scene is re-rendered after resize
  });

  // Function to add objects to the scene and trigger render
  const addObjectToScene = (object: Object3D): void => {
    scene.add(object);
    render(); // Explicitly render scene after adding object
  };

  return { scene, camera, renderer, cameraControls, addObjectToScene };
}

export default createBasicScene;
