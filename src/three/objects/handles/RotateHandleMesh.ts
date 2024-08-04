import { Mesh } from "three";
import HandleMesh from "./HandleMesh";

class RotateHandleMesh extends HandleMesh {
  constructor(...args: ConstructorParameters<typeof Mesh>) {
    super(...args);
  }
}

export default RotateHandleMesh;
