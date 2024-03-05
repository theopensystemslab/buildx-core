import { BoxGeometry, Mesh, MeshToonMaterial } from "three";

const createBox = () =>
  new Mesh(new BoxGeometry(), new MeshToonMaterial({ color: "tomato" }));

export default createBox;
