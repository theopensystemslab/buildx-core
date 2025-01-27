import RectangleRoundedGeometry from "@/three/geometries/RectangleRoundedGeometry";
import { AbstractStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import { Material, Mesh, MeshBasicMaterial } from "three";

export type StretchAxis = "x" | "z";
export type StretchSide = 1 | -1;

export interface StretchHandleOptions {
  axis: StretchAxis;
  side: StretchSide;
  manager: AbstractStretchManager;
  width?: number;
  height?: number;
  cornerRadius?: number;
  material?: Material;
  // Keep color and opacity for default material creation
  color?: number;
  opacity?: number;
}

class StretchHandleMesh extends Mesh {
  axis: StretchAxis;
  side: StretchSide;
  manager: AbstractStretchManager;

  constructor(options: StretchHandleOptions) {
    const {
      axis,
      side,
      manager,
      width = 1,
      height = 1,
      material,
      color = 0xffffff,
      opacity = 0.7,
    } = options;

    const geometry = new RectangleRoundedGeometry({
      width,
      height,
    });

    // Use provided material or create default
    const meshMaterial =
      material ||
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false,
      });

    super(geometry, meshMaterial);

    this.axis = axis;
    this.side = side;
    this.manager = manager;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.material as Material).dispose();
  }
}

export default StretchHandleMesh;
