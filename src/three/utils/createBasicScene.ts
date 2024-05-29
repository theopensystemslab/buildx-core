import CameraControls from "camera-controls";
import {
  AmbientLight,
  Box3,
  Clock,
  Matrix4,
  Object3D,
  OrthographicCamera,
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
import { EffectComposer, RenderPass } from "three-stdlib";
import { getOutlinePass } from "../effects/outline";

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
  camera: PerspectiveCamera | OrthographicCamera;
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  addObjectToScene: (object: Object3D) => void;
  render: () => void;
  // outlinePass: OutlinePass;
}

const defaultParams = {
  canvas: document?.querySelector("#canvas") as HTMLCanvasElement,
  camera: (() => {
    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    return camera;
  })(),
};

function createBasicScene({
  canvas = defaultParams.canvas,
  camera = defaultParams.camera,
  outliner,
}: {
  canvas?: HTMLCanvasElement;
  camera?: PerspectiveCamera | OrthographicCamera;
  outliner?: (object: Object3D) => Object3D[];
} = defaultParams): BasicSceneComponents {
  const scene = new Scene();

  const renderer = new WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor("white");

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const outlinePass = getOutlinePass(scene, camera);
  composer.addPass(outlinePass);

  const light = new AmbientLight(0xffffff, 4);
  scene.add(light);

  const cameraControls = new CameraControls(camera, canvas);
  const clock = new Clock();

  const render = (): void => {
    composer.render();
    // renderer.render(scene, camera);
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
    if (camera instanceof PerspectiveCamera) {
      camera.aspect = window.innerWidth / window.innerHeight;
    } else if (camera instanceof OrthographicCamera) {
      // Calculate new dimensions based on the aspect ratio
      const aspect = window.innerWidth / window.innerHeight;
      const frustumHeight = camera.top - camera.bottom;
      const frustumWidth = frustumHeight * aspect;

      // Adjust the camera properties
      camera.left = frustumWidth / -2;
      camera.right = frustumWidth / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = frustumHeight / -2;
    }

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    renderPass.setSize(window.innerWidth, window.innerHeight);
    // outlinePass.setSize(window.innerWidth, window.innerHeight);

    render(); // Ensure scene is re-rendered after resize
  });

  // Function to add objects to the scene and trigger render
  const addObjectToScene = (object: Object3D): void => {
    scene.add(object);
    render(); // Explicitly render scene after adding object
  };

  if (outliner) {
    // renderer.domElement.addEventListener("pointermove", onPointerMove);
    // const raycaster = new Raycaster();
    // const mouse = new Vector2();
    // function onPointerMove(event: any) {
    //   if (event.isPrimary === false) return;
    //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    //   checkIntersection();
    // }
    // function checkIntersection() {
    //   raycaster.setFromCamera(mouse, camera);
    //   const intersects = raycaster.intersectObject(scene, true);
    //   pipe(
    //     intersects,
    //     A.head,
    //     O.match(
    //       () => {
    //         outlinePass.selectedObjects = [];
    //       },
    //       (intersect) => {
    //         const object = intersect.object;
    //         if (outliner) {
    //           outlinePass.selectedObjects = outliner(object);
    //         }
    //       }
    //     )
    //   );
    //   render();
    // }
  }

  return {
    scene,
    camera,
    renderer,
    cameraControls,
    addObjectToScene,
    render,
    // outlinePass,
  };
}

export default createBasicScene;
