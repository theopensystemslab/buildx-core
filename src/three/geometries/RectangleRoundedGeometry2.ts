import { BufferGeometry, BufferAttribute } from "three";

class RectangleRoundedGeometry2 extends BufferGeometry {
  constructor(
    width: number,
    height: number,
    radius: number,
    smoothness: number
  ) {
    super();

    const pi2 = Math.PI * 2;
    const n = (smoothness + 1) * 4; // number of segments
    const indices: number[] = [];
    const positions: number[] = [];
    const uvs: number[] = [];

    // Create indices for triangles
    for (let j = 1; j < n + 1; j++) {
      indices.push(0, j, j + 1); // 0 is center
    }
    indices.push(0, n, 1);

    // Add center point
    positions.push(0, 0, 0);
    uvs.push(0.5, 0.5);

    // Generate contour points
    for (let j = 0; j < n; j++) {
      const qu = Math.trunc((4 * j) / n) + 1; // quadrant  qu: 1..4
      const sgx = qu === 1 || qu === 4 ? 1 : -1; // signum left/right
      const sgy = qu < 3 ? 1 : -1; // signum  top / bottom

      // corner center + circle
      const x =
        sgx * (width / 2 - radius) +
        radius * Math.cos((pi2 * (j - qu + 1)) / (n - 4));
      const y =
        sgy * (height / 2 - radius) +
        radius * Math.sin((pi2 * (j - qu + 1)) / (n - 4));

      positions.push(x, y, 0);
      uvs.push(0.5 + x / width, 0.5 + y / height);
    }

    // Set attributes
    this.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
    this.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  }
}

export default RectangleRoundedGeometry2;
