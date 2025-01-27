import { Brush } from "three-bvh-csg";

class HandleBrush extends Brush {
  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
  }
}

export default HandleBrush;
