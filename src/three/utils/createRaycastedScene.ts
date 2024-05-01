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
import { EffectComposer, OutlinePass, RenderPass } from "three-stdlib";

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
  renderer: WebGLRenderer;
  cameraControls: CameraControls;
  render: () => void;
}

const defaultParams = {
  canvas: document.querySelector("#canvas") as HTMLCanvasElement,
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

function createRaycastedScene({
  canvas = defaultParams.canvas,
  camera = defaultParams.camera,
}: {
  canvas?: HTMLCanvasElement;
  camera?: PerspectiveCamera | OrthographicCamera;
} = defaultParams): BasicSceneComponents {
  const scene = new Scene();

  const renderer = new WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const outlinePass = new OutlinePass(
    new Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  composer.addPass(outlinePass);

  const light = new AmbientLight(0xffffff);
  scene.add(light);

  const cameraControls = new CameraControls(camera, canvas);
  const clock = new Clock();

  const render = (): void => {
    composer.render();
  };

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
    outlinePass.setSize(window.innerWidth, window.innerHeight);

    render(); // Ensure scene is re-rendered after resize
  });

  // if (outliner) {
  //   renderer.domElement.addEventListener("pointermove", onPointerMove);

  //   const raycaster = new Raycaster();

  //   const mouse = new Vector2();

  //   function onPointerMove(event: any) {
  //     if (event.isPrimary === false) return;

  //     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //     checkIntersection();
  //   }

  //   function checkIntersection() {
  //     raycaster.setFromCamera(mouse, camera);

  //     const intersects = raycaster.intersectObject(scene, true);

  //     pipe(
  //       intersects,
  //       A.head,
  //       O.match(
  //         () => {
  //           outlinePass.selectedObjects = [];
  //         },
  //         (intersect) => {
  //           const object = intersect.object;
  //           if (outliner) {
  //             outlinePass.selectedObjects = outliner(object);
  //           }
  //         }
  //       )
  //     );

  //     render();
  //   }
  // }

  const mouse = new Vector2();
  const offset = new Vector3();
  const raycaster = new Raycaster();

  let selectedObject: Object3D | null = null;

  function onPointerDown(event: PointerEvent): void {
    event.preventDefault();

    // Update the mouse variable using the normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster position based on the current camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Perform the intersection test
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      cameraControls.enabled = false;
      selectedObject = intersects[0].object;
      offset.copy(intersects[0].point).sub(selectedObject.position);
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!selectedObject) return;

    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(selectedObject);

    if (intersects.length > 0) {
      const d = intersects[0].point.sub(offset);
      selectedObject.position.copy(d);
      render();
    }
  }

  function onPointerUp(): void {
    selectedObject = null;
    cameraControls.enabled = true;
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove, false);
  renderer.domElement.addEventListener("pointerup", onPointerUp, false);

  return {
    scene,
    renderer,
    render,
    cameraControls,
  };
}

export default createRaycastedScene;
