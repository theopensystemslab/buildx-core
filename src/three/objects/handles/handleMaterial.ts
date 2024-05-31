// import tailwindConfig from "@/tailwind.config"
import { DoubleSide, MeshStandardMaterial } from "three";

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

export default handleMaterial;
