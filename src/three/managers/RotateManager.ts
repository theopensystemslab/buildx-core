import { HouseGroup } from "../objects/house/HouseGroup";
import {
  Vector3,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Line,
  LineBasicMaterial,
  BufferGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  CanvasTexture,
} from "three";

class RotateManager {
  private houseGroup: HouseGroup;
  private debugObjects: {
    centerMarker?: Mesh;
    currentPointMarker?: Mesh;
    line?: Line;
    textSprite?: Sprite;
  } = {};
  private startAngle: number | null = null;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  get scene() {
    return this.houseGroup.scene;
  }

  get center() {
    return this.houseGroup.unsafeOBB.center.clone();
  }

  initGesture(currentPoint: Vector3) {
    this.createDebugObjects();
    this.startAngle = this.calculateAngle(currentPoint);
  }

  gestureProgress(currentPoint: Vector3) {
    // const currentPoint = new Vector3(delta.x, 0, delta.z).add(center);
    this.updateDebugVisuals(currentPoint);

    const angle = this.calculateAngle(currentPoint);

    if (this.startAngle === null) {
      this.startAngle = angle;
    }

    this.applyRotation(angle);
    this.updateDebugInfo(angle);
  }

  gestureEnd() {
    const {
      userData: { houseId },
      rotation,
    } = this.houseGroup;

    this.houseGroup.hooks?.onHouseUpdate?.(houseId, {
      rotation: rotation.y,
    });
    this.houseGroup.updateBBs();

    this.cleanupDebugObjects();
    this.startAngle = null;
  }

  private createDebugObjects() {
    const center = this.center;

    console.log(center.toArray());

    const centerMarker = new Mesh(
      new SphereGeometry(0.1),
      new MeshBasicMaterial({ color: 0xff0000 })
    );
    centerMarker.position.copy(center);
    this.scene.add(centerMarker);

    const currentPointMarker = centerMarker.clone();
    currentPointMarker.material = new MeshBasicMaterial({ color: 0x00ff00 });
    this.scene.add(currentPointMarker);

    const lineMaterial = new LineBasicMaterial({ color: 0xffff00 });
    const lineGeometry = new BufferGeometry().setFromPoints([center, center]);
    const line = new Line(lineGeometry, lineMaterial);
    this.scene.add(line);

    const textSprite = this.createTextSprite("Angle: 0°");
    this.scene.add(textSprite);

    this.debugObjects = { centerMarker, currentPointMarker, line, textSprite };
  }

  private updateDebugVisuals(currentPoint: Vector3) {
    if (!this.debugObjects.currentPointMarker || !this.debugObjects.line)
      return;

    this.debugObjects.currentPointMarker.position.copy(currentPoint);

    const linePoints = [this.center, currentPoint];
    (this.debugObjects.line.geometry as BufferGeometry).setFromPoints(
      linePoints
    );
  }

  private calculateAngle(currentPoint: Vector3): number {
    const center = this.center;
    return Math.atan2(currentPoint.z - center.z, currentPoint.x - center.x);
  }

  private applyRotation(currentAngle: number) {
    if (this.startAngle === null) return;
    const deltaAngle = currentAngle - this.startAngle;
    this.houseGroup.rotation.y = -deltaAngle;
  }

  private updateDebugInfo(angle: number) {
    if (!this.debugObjects.textSprite || this.startAngle === null) return;
    const deltaAngle = angle - this.startAngle;
    const degrees = (deltaAngle * 180) / Math.PI;
    this.updateTextSprite(
      this.debugObjects.textSprite,
      `Angle: ${degrees.toFixed(2)}°`
    );
  }

  private cleanupDebugObjects() {
    Object.values(this.debugObjects).forEach((obj) => obj?.parent?.remove(obj));
    this.debugObjects = {};
  }

  private createTextSprite(text: string): Sprite {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 128;

    if (context) {
      context.font = "24px Arial";
      context.fillStyle = "white";
      context.fillText(text, 0, 64);
    }

    const texture = new CanvasTexture(canvas);
    const spriteMaterial = new SpriteMaterial({ map: texture });
    const sprite = new Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    sprite.position.set(0, 2, 0); // Adjust position as needed

    return sprite;
  }

  private updateTextSprite(sprite: Sprite, newText: string) {
    const texture = sprite.material.map as Texture;
    if (texture instanceof CanvasTexture) {
      const canvas = texture.image as HTMLCanvasElement;
      const context = canvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.font = "24px Arial";
        context.fillStyle = "white";
        context.fillText(newText, 0, 64);
      }
      texture.needsUpdate = true;
    }
  }
}

export default RotateManager;
