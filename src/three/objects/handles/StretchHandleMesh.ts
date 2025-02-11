import { Y_LAYER_1 } from "@/constants";
import RectangleRoundedGeometry from "@/three/geometries/RectangleRoundedGeometry";
import { AbstractStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import { Material } from "three";
import HandleMesh from "./HandleMesh";

export const FADED_OPACITY = 0.15;

export type StretchAxis = "x" | "z";
export type StretchSide = 1 | -1;

export interface StretchHandleOptions {
  axis: StretchAxis;
  side: StretchSide;
  manager: AbstractStretchManager;
  width?: number;
  depth?: number;
  material?: Material;
  // Keep color and opacity for default material creation
  color?: number;
  opacity?: number;
}

// we're going to scale by 0.1 ultimately
export const DEFAULT_HANDLE_SIZE = 0.5;

export const MULTIPLIER = 0.6;

class StretchHandleMesh extends HandleMesh {
  axis: StretchAxis;
  side: StretchSide;
  manager: AbstractStretchManager;

  constructor(options: StretchHandleOptions) {
    const {
      axis,
      side,
      manager,
      width = DEFAULT_HANDLE_SIZE,
      depth = DEFAULT_HANDLE_SIZE,
      material,
    } = options;

    const geometry = new RectangleRoundedGeometry(
      width * MULTIPLIER * 10,
      depth * MULTIPLIER * 10,
      1,
      1.5,
      // min(width, depth) * 0.5 * 10,
      12
    );

    super(geometry, material);

    this.renderOrder = 999;

    this.scale.set(0.1, 0.1, 0.01);
    this.rotation.x = Math.PI / 2;
    this.position.y = Y_LAYER_1;

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
