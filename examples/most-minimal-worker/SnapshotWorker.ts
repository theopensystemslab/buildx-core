import {
  AmbientLight,
  Group,
  Matrix3,
  ObjectLoader,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OBB } from "three-stdlib";
import { adjustCameraToAndFrameOBB } from "@/three/utils/camera";

console.log("hi I'm snapshot worker");

const SIZE = 512,
  width = SIZE,
  height = SIZE;

const offscreenCanvas = new OffscreenCanvas(width, height);

const scene = new Scene();
const objectsGroup = new Group();
scene.add(objectsGroup);
const ambientLight = new AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const camera = new OrthographicCamera();
const renderer = new WebGLRenderer({ canvas: offscreenCanvas });

renderer.setSize(width, height, false);

const objectLoader = new ObjectLoader();

self.onmessage = function ({
  data: {
    objectJson,
    obb: { center, halfSize, rotation },
  },
}: MessageEvent<{ objectJson: any; obb: OBB }>) {
  const object = objectLoader.parse(objectJson);
  objectsGroup.add(object);

  console.log(center, halfSize);

  // @ts-ignore
  const rotMat = new Matrix3(...rotation.elements);

  const obb = new OBB(
    new Vector3(center.x, center.y, center.z),
    new Vector3(halfSize.x, halfSize.y, halfSize.z),
    rotMat
  );

  adjustCameraToAndFrameOBB(obb, camera);

  renderer.render(scene, camera);

  offscreenCanvas.convertToBlob().then(function (blob) {
    const blobURL = URL.createObjectURL(blob);

    self.postMessage({ type: "canvasImage", blobURL: blobURL });

    objectsGroup.clear();
  });
};
