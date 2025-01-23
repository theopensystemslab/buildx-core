// import tailwindConfig from "@/tailwind.config"
import { AdditiveBlending, DoubleSide, MeshStandardMaterial } from "three";

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

export const createHandleMaterial = () =>
  new MeshStandardMaterial({
    color,
    emissive: color,
    side: DoubleSide,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: AdditiveBlending,
  });

export default handleMaterial;
