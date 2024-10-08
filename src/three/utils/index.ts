import { compareProps } from "@/utils/functions";
import { Material } from "three";
import { ScopeElement } from "../objects/types";

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

export const compareScopeElement = (a: ScopeElement, b: ScopeElement) =>
  compareProps(a, b, [
    "houseId",
    "columnIndex",
    "rowIndex",
    "moduleIndex",
    "dna",
    "ifcTag",
  ]);
