import { BufferAttribute, BufferGeometry } from "three";

/**
 * Applies planar projection to generate UV coordinates for a Three.js BufferGeometry.
 * Projects onto the XY plane and scales the coordinates to the [0, 1] UV range.
 * @param geometry The Three.js BufferGeometry to modify.
 */
export const applyPlanarProjectionUVs = (
  geometry: BufferGeometry
): BufferGeometry => {
  const positionsAttribute = geometry.getAttribute("position");
  if (!positionsAttribute)
    throw new Error("Geometry does not have position attribute.");

  const positions = positionsAttribute.array;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  // Calculate bounds for scaling
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // Generate UVs based on scaled positions
  const uvs = new Float32Array((positions.length / 3) * 2);
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    uvs[j] = (positions[i] - minX) / (maxX - minX);
    uvs[j + 1] = (positions[i + 1] - minY) / (maxY - minY);
  }

  // Update the geometry with the new UVs
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));

  return geometry;
};
