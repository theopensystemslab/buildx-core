import { Mesh } from "three";
import HandleMesh from "./HandleMesh";
import StretchHandleGroup, {
  StretchAxis,
  StretchSide,
} from "./StretchHandleGroup";
import { AbstractStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";

class StretchHandleMesh extends HandleMesh {
  constructor(...args: ConstructorParameters<typeof Mesh>) {
    super(...args);
  }

  get manager(): AbstractStretchManager {
    if (this.parent instanceof StretchHandleGroup) {
      return this.parent.manager;
    } else {
      throw new Error(`no stretch manager for handle mesh`);
    }
  }

  get side(): StretchSide {
    if (!(this.parent instanceof StretchHandleGroup)) throw Error(`bad parent`);
    return this.parent.userData.side;
  }

  get axis(): StretchAxis {
    if (!(this.parent instanceof StretchHandleGroup)) throw Error(`bad parent`);
    return this.parent.userData.axis;
  }
}

export default StretchHandleMesh;
