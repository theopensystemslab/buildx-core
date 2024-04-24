import { createBasicScene } from "@/index";
import OBBMesh from "@/three/objects/OBBMesh";
import { Vector3 } from "three";
import { OBB } from "three-stdlib";
import SnapshotWorker from "./SnapshotWorker?worker";

const snapshotWorker = new SnapshotWorker();

const { addObjectToScene } = createBasicScene();

const halfSize = new Vector3(1.5, 1, 2);
const center = new Vector3(-3, 1, -1);
const obb = new OBB(center, halfSize);
const obbMesh = new OBBMesh(obb);
const objectJson = obbMesh.toJSON();

addObjectToScene(obbMesh);

window.addEventListener("click", () => {
  snapshotWorker.postMessage({ objectJson, obb });
});

snapshotWorker.onmessage = (ev) => {
  console.log(ev.data);
};
