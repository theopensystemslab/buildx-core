import { O, someOrError } from "@/utils/functions";
import { flow } from "fp-ts/lib/function";
import { Object3D, Scene } from "three";

export const findFirstGuardUp =
  <T extends Object3D>(guard: (o: Object3D) => o is T) =>
  (object: Object3D): O.Option<T> => {
    if (guard(object)) {
      return O.some(object);
    }

    const parent = object.parent;

    if (parent !== null) {
      return findFirstGuardUp(guard)(parent);
    }

    return O.none;
  };

export const findScene = flow(
  findFirstGuardUp((o): o is Scene => o instanceof Scene),
  someOrError(`scene not found above ZStretchManager's columnLayoutGroup`)
);
