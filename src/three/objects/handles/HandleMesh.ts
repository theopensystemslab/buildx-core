import { Mesh } from "three";

class HandleMesh extends Mesh {
  constructor(...args: ConstructorParameters<typeof Mesh>) {
    super(...args);
  }
}

export default HandleMesh;
