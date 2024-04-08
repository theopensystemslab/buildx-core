import { E } from "@/utils/functions";
import { Object3D, Scene } from "three";

// Adjust the type signatures as necessary for your use case
export const findScene = (object: Object3D): E.Either<Error, Scene> => {
  while (object.parent !== null) {
    object = object.parent;
    if (object instanceof Scene) {
      return E.right(object);
    }
  }
  return E.left(new Error("Scene not found"));
};
