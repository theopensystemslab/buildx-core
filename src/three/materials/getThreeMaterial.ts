import { Material } from "three";
import createThreeMaterial from "./createThreeMaterial";
import { CachedBuildMaterial } from "@/data/build-systems";

// Define the cache type
type MaterialCache = Map<string, Material>;

// Initialize the cache
const materialsCache: MaterialCache = new Map();

// Utility function to generate a unique key
const generateMaterialKey = (systemId: string, specification: string): string =>
  `${systemId}|${specification}`;

// Function to get or create a Three.js material
export const getThreeMaterial = (material: CachedBuildMaterial): Material => {
  const key = generateMaterialKey(material.systemId, material.specification);

  // Attempt to retrieve the material from the cache
  const cachedMaterial = materialsCache.get(key);
  if (cachedMaterial) {
    return cachedMaterial;
  }

  // Material is not in cache; create, cache, and return it
  const newMaterial = createThreeMaterial(material);
  materialsCache.set(key, newMaterial);
  return newMaterial;
};
