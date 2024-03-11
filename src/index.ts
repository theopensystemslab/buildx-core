import "./style.css";
import createBasicScene from "./three/createBasicScene";
import createBox from "./three/materials/createBox";

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

const { addObjectToScene } = createBasicScene(canvas);

const box = createBox();

addObjectToScene(box);

// TODO: const modelsTask = ???
