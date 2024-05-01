import OBBMesh from "@/three/objects/OBBMesh";
import createRaycastedScene from "@/three/utils/createRaycastedScene";
import { Matrix3, Matrix4, Vector3 } from "three";
import { OBB } from "three-stdlib";

const { scene, render } = createRaycastedScene();

const halfSize = new Vector3(1.5, 1, 2);
const center = new Vector3(-3, 1, -1);
const obb = new OBB(
  center,
  halfSize,
  new Matrix3().setFromMatrix4(new Matrix4().makeRotationY((Math.PI / 4) * 3))
);
const obbMesh = new OBBMesh(obb);

scene.add(obbMesh);

render();
