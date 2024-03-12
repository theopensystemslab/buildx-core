import { AxesHelper, Matrix3, Matrix4, Vector3 } from "three";
import { OBB } from "three-stdlib";
import createBasicScene from "../three/createBasicScene";
import OBBMesh from "../three/objects/OBBMesh";

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

const { addObjectToScene, renderer, scene, camera } = createBasicScene({
  canvas,
});

const halfSize = new Vector3(1, 2, 3);
const center = new Vector3(3, 2, 1);

let rotationAngle = 0;
const rotationSpeed = 0.05; // Adjust this value to change the speed of the rotation

const rotation = new Matrix3().setFromMatrix4(
  new Matrix4().makeRotationAxis(new Vector3(0, 1, 0), rotationAngle)
);

const obb = new OBB(center, halfSize, rotation);

const obbRep = new OBBMesh(obb);

addObjectToScene(obbRep);

const axesHelper = new AxesHelper();

addObjectToScene(axesHelper);

let animationEnabled = true;
let frameCount = 0;
const maxFrames = Infinity;

function animate() {
  if (frameCount >= maxFrames) animationEnabled = false;
  if (animationEnabled) requestAnimationFrame(animate);

  frameCount++;
  rotationAngle += rotationSpeed;

  const oscillatingAngle = Math.sin(rotationAngle) * (Math.PI / 2); // Oscillate +/- 45 degrees

  obb.rotation.setFromMatrix4(
    new Matrix4().makeRotationAxis(new Vector3(0, 1, 0), oscillatingAngle)
  );
  obbRep.syncWithOBB();

  renderer.render(scene, camera);
}

animate();
