import { Mesh } from "three";
import HandleMesh from "./HandleMesh";
import { HouseGroup } from "../house/HouseGroup";

class RotateHandleMesh extends HandleMesh {
  constructor(...args: ConstructorParameters<typeof Mesh>) {
    super(...args);
  }

  get houseGroup(): HouseGroup {
    if (this.parent?.parent?.parent instanceof HouseGroup)
      return this.parent.parent.parent;
    else throw new Error(`get houseGroup failed`);
  }
}

export default RotateHandleMesh;
