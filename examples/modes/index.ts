import { cachedHouseTypesTE } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
import GestureManager from "@/three/managers/GestureManager";
import { ElementBrush } from "@/three/objects/house/ElementGroup";
import { A, TE } from "@/utils/functions";
import CameraControls from "camera-controls";
import { flow, pipe } from "fp-ts/lib/function";
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Clock,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
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

CameraControls.install({ THREE: subsetOfTHREE });

const clock = new Clock();
const camera = new PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setClearColor("white");

document.body.appendChild(renderer.domElement);
const scene = new Scene();

const light = new AmbientLight(0xffffff, 4);
scene.add(light);

const cameraControls = new CameraControls(camera, renderer.domElement);

const d = 15;

cameraControls.setLookAt(d, d, d, 0, 0, 0);

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshBasicMaterial({ color: 0x00ff00 });
const testObject = new Mesh(geometry, material);
// scene.add(testObject);

const gestureEnabledObjects: Mesh[] = [testObject];

const gestureManager = new GestureManager({
  domElement: renderer.domElement,
  camera,
  gestureEnabledObjects,
  onGestureStart: () => {
    cameraControls.enabled = false;
  },
  onGestureEnd: () => {
    cameraControls.enabled = true;
  },
  // onDragProgress: ({
  //   delta: { x: x1, z: z1 },
  //   object,
  //   originalPosition: { x: x0, y, z: z0 },
  // }) => {
  //   object?.position.set(x0 + x1, y, z0 + z1);
  // },
  // onSingleTap: (v) => {
  //   console.log(v);
  // },
  onDoubleTap: ({ object }) => {
    if (object instanceof ElementBrush) {
      object.houseGroup.modeManager.down();
    }
  },
});

function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

pipe(
  cachedHouseTypesTE,
  TE.chain(
    flow(
      A.lookup(0),
      TE.fromOption(() => Error())
    )
  ),
  TE.chain(({ id: houseTypeId, name, systemId, dnas }) =>
    houseGroupTE({
      systemId,
      dnas,
      friendlyName: name,
      houseId: name,
      houseTypeId,
    })
  ),
  TE.map((houseGroup) => {
    scene.add(houseGroup);
    gestureManager.addGestureEnabledObject(houseGroup);
  })
)();
