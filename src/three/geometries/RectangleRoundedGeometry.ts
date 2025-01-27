import { BufferAttribute, BufferGeometry } from "three";

interface RectangleRoundedParams {
  width?: number;
  height?: number;
  radiusCorner?: number;
  smoothness?: number;
}

class RectangleRoundedGeometry extends BufferGeometry {
  constructor({
    width = 1,
    height = 1,
    radiusCorner = 0.2,
    smoothness = 4,
  }: RectangleRoundedParams = {}) {
    super();

    const pi2 = Math.PI * 2;
    const n = (smoothness + 1) * 4; // number of segments
    const indices: number[] = [];
    const positions: number[] = [];
    const uvs: number[] = [];

    // Create center vertex
    positions.push(0, 0, 0);
    uvs.push(0.5, 0.5);

    // Create triangles from center
    for (let j = 1; j < n + 1; j++) {
      indices.push(0, j, j + 1);
    }
    indices.push(0, n, 1);

    // Create contour vertices
    for (let j = 0; j < n; j++) {
      const qu = Math.trunc((4 * j) / n) + 1; // quadrant  qu: 1..4
      const sgx = qu === 1 || qu === 4 ? 1 : -1; // signum left/right
      const sgy = qu < 3 ? 1 : -1; // signum  top / bottom

      // corner center + circle
      const x =
        sgx * (width / 2 - radiusCorner) +
        radiusCorner * Math.cos((pi2 * (j - qu + 1)) / (n - 4));
      const y =
        sgy * (height / 2 - radiusCorner) +
        radiusCorner * Math.sin((pi2 * (j - qu + 1)) / (n - 4));

      positions.push(x, y, 0);
      uvs.push(0.5 + x / width, 0.5 + y / height);
    }

    this.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
    this.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  }
}

export default RectangleRoundedGeometry;
