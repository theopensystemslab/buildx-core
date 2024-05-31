import { Mesh } from "three";
import HandleMesh from "./HandleMesh";
import ZStretchManager2 from "@/three/managers/ZStretchManager2";
import StretchHandleGroup, {
  StretchAxis,
  StretchSide,
} from "./StretchHandleGroup";

class StretchHandleMesh extends HandleMesh {
  constructor(...args: ConstructorParameters<typeof Mesh>) {
    super(...args);
  }

  get manager(): ZStretchManager2 {
    if (this.parent instanceof StretchHandleGroup) {
      return this.parent.houseGroup.zStretchManager;
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
