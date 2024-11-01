import { Camera, Group, Mesh, Object3D, Scene, Vector2 } from "three";
import { OutlinePass } from "three-stdlib";

export const createOutlinePass = (scene: Scene, camera: Camera) => {
  return new OutlinePass(
    new Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
};

export const getMeshes = (object: Object3D): Mesh[] => {
  if (object instanceof Mesh) {
    return [object];
  }

  const meshes: Mesh[] = [];

  if (object instanceof Group) {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        meshes.push(child);
      }
    });
    return meshes;
  }

  return meshes;
};
