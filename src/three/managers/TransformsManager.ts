import { Group } from "three";

class TransformsManager {
  root: Group;

  constructor(root: Group) {
    this.root = root;
  }
}

export default TransformsManager;
