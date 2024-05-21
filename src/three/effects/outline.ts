import { Camera, Group, Mesh, Object3D, Scene, Vector2 } from "three";
import { OutlinePass } from "three-stdlib";

let outlinePass: OutlinePass | null = null;

export const getOutlinePass = (scene: Scene, camera: Camera) => {
  if (outlinePass === null) {
    outlinePass = new OutlinePass(
      new Vector2(window.innerWidth, window.innerHeight),
      scene,
      camera
    );
  }
  return outlinePass;
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

export const outlineObject = (object: Object3D) => {
  if (outlinePass !== null) {
    const meshes = getMeshes(object);
    outlinePass.selectedObjects = meshes;
  }
};
