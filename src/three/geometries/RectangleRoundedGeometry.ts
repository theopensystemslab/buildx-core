import { BufferGeometry, BufferAttribute } from "three";

class RectangleRoundedGeometry extends BufferGeometry {
  constructor(
    width: number,
    height: number,
    depth: number,
    radius: number,
    smoothness: number
  ) {
    super();

    const pi2 = Math.PI * 2;
    const n = (smoothness + 1) * 4; // number of segments per face
    const indices: number[] = [];
    const positions: number[] = [];
    const uvs: number[] = [];

    // Helper function to create a face (top or bottom)
    const createFace = (isTop: boolean) => {
      const z = isTop ? depth / 2 : -depth / 2;
      const baseIndex = positions.length / 3;

      // Add center point
      positions.push(0, 0, z);
      uvs.push(0.5, 0.5);

      // Generate contour points
      for (let j = 0; j < n; j++) {
        const qu = Math.trunc((4 * j) / n) + 1;
        const sgx = qu === 1 || qu === 4 ? 1 : -1;
        const sgy = qu < 3 ? 1 : -1;

        const x =
          sgx * (width / 2 - radius) +
          radius * Math.cos((pi2 * (j - qu + 1)) / (n - 4));
        const y =
          sgy * (height / 2 - radius) +
          radius * Math.sin((pi2 * (j - qu + 1)) / (n - 4));

        positions.push(x, y, z);
        uvs.push(0.5 + x / width, 0.5 + y / height);
      }

      // Create face triangles
      for (let j = 1; j < n + 1; j++) {
        if (isTop) {
          indices.push(baseIndex, baseIndex + j, baseIndex + ((j % n) + 1));
        } else {
          indices.push(baseIndex, baseIndex + ((j % n) + 1), baseIndex + j);
        }
      }
    };

    // Create top and bottom faces
    createFace(true); // top face
    createFace(false); // bottom face

    // Create side walls
    const topStart = 1; // First vertex after top center
    const bottomStart = n + 2; // First vertex after bottom center

    // Create side triangles
    for (let i = 0; i < n; i++) {
      const i1 = topStart + i;
      const i2 = topStart + ((i + 1) % n);
      const i3 = bottomStart + i;
      const i4 = bottomStart + ((i + 1) % n);

      // Add two triangles for each side segment
      indices.push(i1, i3, i4);
      indices.push(i1, i4, i2);
    }

    // Set attributes
    this.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
    this.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );
    this.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));

    // Compute normals
    this.computeVertexNormals();
  }
}

export default RectangleRoundedGeometry;
