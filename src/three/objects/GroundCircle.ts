import {
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  Material,
  DoubleSide,
} from "three";

class GroundCircle extends Mesh {
  constructor(
    radius: number = 10,
    material: Material = new MeshBasicMaterial({
      color: 0x9e9e9e,
      side: DoubleSide,
    })
  ) {
    super();
    this.geometry = new CircleGeometry(radius, 32); // 32 segments for a relatively smooth circle
    this.material = material;
    this.rotation.x = -Math.PI / 2; // Rotate to make it lie flat on the ground
  }
}

export default GroundCircle;
