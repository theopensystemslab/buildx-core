import { Object3D } from "three";

export const DEFAULT_LAYER = 0;
export const RAYCAST_ONLY_LAYER = 1;
export const CAMERA_ONLY_LAYER = 2;
export const HIDDEN_LAYER = 3;

export const showObject = (object: Object3D) => {
  object.visible = true;
  object.traverse((node) => {
    node.layers.set(DEFAULT_LAYER);
  });
};

export const hideObject = (object: Object3D) => {
  object.visible = false;
  object.traverse((node) => {
    node.layers.set(HIDDEN_LAYER);
  });
};

export const showObjectCameraOnly = (object: Object3D) => {
  object.visible = true;
  object.traverse((node) => {
    node.layers.set(CAMERA_ONLY_LAYER);
  });
};
