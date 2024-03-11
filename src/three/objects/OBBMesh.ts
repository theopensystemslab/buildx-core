import { BoxGeometry, Matrix4, Mesh, MeshToonMaterial } from "three";
import { OBB } from "three-stdlib";

type OBBUserData = {
  obb: OBB;
};

class OBBMesh extends Mesh {
  declare geometry: BoxGeometry;
  declare userData: OBBUserData;

  constructor(
    obb: OBB,
    material = new MeshToonMaterial({ color: "tomato", wireframe: true })
  ) {
    const { center, halfSize } = obb;
    const size = halfSize.clone().multiplyScalar(2);

    const geometry = new BoxGeometry(size.x, size.y, size.z);

    super(geometry, material);

    this.position.copy(center);
    this.setRotationFromMatrix(new Matrix4().setFromMatrix3(obb.rotation));

    this.userData.obb = obb;
  }

  syncWithOBB() {
    const obb = this.userData.obb;
    const { center, halfSize } = obb;
    const size = halfSize.clone().multiplyScalar(2);

    const epsilon = 0.0001; // Small tolerance for floating-point comparisons

    const needsGeometryUpdate =
      Math.abs(this.geometry.parameters.width - size.x) > epsilon ||
      Math.abs(this.geometry.parameters.height - size.y) > epsilon ||
      Math.abs(this.geometry.parameters.depth - size.z) > epsilon;

    if (needsGeometryUpdate) {
      this.geometry.dispose();
      this.geometry = new BoxGeometry(size.x, size.y, size.z);
    }

    this.position.copy(center);
    this.setRotationFromMatrix(new Matrix4().setFromMatrix3(obb.rotation));
  }
}

export default OBBMesh;
