// import tailwindConfig from "@/tailwind.config"
import {
  DoubleSide,
  MeshStandardMaterial,
  MeshStandardMaterialParameters,
} from "three";

const colors = {
  default: "white",
  alt: "#262626",
};

const color = colors.default;

const handleMaterial = new MeshStandardMaterial({
  color,
  emissive: color,
  side: DoubleSide,
});

export const createHandleMaterial = (
  params: MeshStandardMaterialParameters = {}
) =>
  new MeshStandardMaterial({
    color,
    emissive: color,
    side: DoubleSide,
    transparent: true,
    ...params,
  });

export default handleMaterial;
