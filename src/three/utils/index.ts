import { Material } from "three";

export const applyToMaterial = (
  object: { material: Material | Material[] },
  fn: (material: Material) => void
): void => {
  const { material } = object;
  if (Array.isArray(material)) {
    material.forEach(fn);
  } else {
    fn(material);
  }
};
