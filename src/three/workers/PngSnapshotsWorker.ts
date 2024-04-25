import {
  AmbientLight,
  Group,
  Matrix4,
  ObjectLoader,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";

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

const positionCamera = (camera: OrthographicCamera, maxDim: number) => {
  const scale = 2; // This factor can be adjusted to increase or decrease the visible area

  camera.left = (-scale * maxDim) / 2;
  camera.right = (scale * maxDim) / 2;
  camera.top = (scale * maxDim) / 2;
  camera.bottom = (-scale * maxDim) / 2;

  const angleY = Math.PI / 4; // 45 degrees rotation around Y
  const angleElevation = Math.PI / 4; // 45 degrees elevation
  const distanceFromObject = maxDim * 1.5; // Distance is 1.5 times the max dimension
  camera.position.set(
    Math.cos(angleY) * distanceFromObject,
    Math.sin(angleElevation) * distanceFromObject,
    Math.sin(angleY) * distanceFromObject
  );

  camera.lookAt(scene.position);
  camera.updateProjectionMatrix();
};

self.onmessage = function ({
  data: { objectJson, halfSize },
}: MessageEvent<{
  objectJson: any;
  halfSize: number[];
}>) {
  const object = objectLoader.parse(objectJson);
  object.position.set(0, 0, 0);
  object.setRotationFromMatrix(new Matrix4());
  objectsGroup.add(object);

  const maxDim = Math.max(...halfSize.map((x) => x * 2));

  positionCamera(camera, maxDim);

  renderer.render(scene, camera);

  offscreenCanvas.convertToBlob().then(function (blob) {
    const blobURL = URL.createObjectURL(blob);

    self.postMessage({ type: "canvasImage", blobURL: blobURL });

    objectsGroup.clear();
  });
};
