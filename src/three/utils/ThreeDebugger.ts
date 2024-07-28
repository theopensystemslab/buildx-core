import { Scene, Vector3, Line, BufferGeometry, LineBasicMaterial } from "three";

export class ThreeDebugger {
  private scene: Scene;
  private debugLines: Map<string, Line> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  createDebugLine(name: string, color: number = 0xff0000): Line {
    const points = [new Vector3(-10, 0, 0), new Vector3(10, 0, 0)];
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color });
    const line = new Line(geometry, material);

    this.scene.add(line);
    this.debugLines.set(name, line);

    return line;
  }

  updateDebugLine(name: string, position: Vector3): void {
    const line = this.debugLines.get(name);
    if (line) {
      line.position.copy(position);
    }
  }

  removeDebugLine(name: string): void {
    const line = this.debugLines.get(name);
    if (line) {
      this.scene.remove(line);
      this.debugLines.delete(name);
    }
  }

  clearAllDebugLines(): void {
    this.debugLines.forEach((line) => {
      this.scene.remove(line);
    });
    this.debugLines.clear();
  }
}
