import { BoxGeometry, Mesh, MeshToonMaterial } from "three";
import "./style.css";
import createBasicScene from "./three/createBasicScene";

export { sum } from "./sum";

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

const { addObjectToScene } = createBasicScene(canvas);

const box = new Mesh(
  new BoxGeometry(),
  new MeshToonMaterial({ color: "tomato" })
);

addObjectToScene(box);
