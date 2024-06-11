import { BuildXScene } from "@/index";
import OBBMesh from "@/three/objects/OBBMesh";
import { Group, Matrix3, Matrix4, Vector3 } from "three";
import { OBB } from "three-stdlib";

const scene = new BuildXScene();

const halfSize = new Vector3(1.5, 1, 2);
const center = new Vector3(-3, 1, -1);
const obb = new OBB(
  center,
  halfSize,
  new Matrix3().setFromMatrix4(new Matrix4().makeRotationY((Math.PI / 4) * 3))
);
const obbMesh = new OBBMesh(obb);

const group = new Group();

group.add(obbMesh);

group.scale.setScalar(2);

scene.add(group);

group.visible = false;
obbMesh.visible = true;
