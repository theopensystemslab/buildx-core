import { Brush, Evaluator, ADDITION } from "three-bvh-csg";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { BoxGeometry, DoubleSide, MeshBasicMaterial } from "three";
import {
  ClippedElementBrush,
  FullElementBrush,
} from "../objects/house/ElementGroup";
import { isModuleGroup } from "../objects/house/ModuleGroup";

const PAD = 3;

const clippingMaterial = new MeshBasicMaterial({
  color: "white",
  side: DoubleSide,
});

class CutsManager2 {
  private _layoutGroup: ColumnLayoutGroup;
  private _evaluator: Evaluator;
  private _clippingBrushes: {
    x?: Brush;
    y?: Brush;
    z?: Brush;
    xz?: Brush;
  };

  constructor(layoutGroup: ColumnLayoutGroup) {
    this._layoutGroup = layoutGroup;
    this._evaluator = new Evaluator();
    this._clippingBrushes = {};
  }

  get layoutGroup() {
    return this._layoutGroup;
  }

  set layoutGroup(layoutGroup: ColumnLayoutGroup) {
    this._layoutGroup = layoutGroup;
  }

  private createClippingBrushX() {
    const {
      obb: { halfSize },
    } = this.layoutGroup;

    const width = halfSize.x + PAD;
    const height = halfSize.y * 2 + PAD;
    const depth = halfSize.z * 2 + PAD;

    const x = width / 2;
    const y = halfSize.y;
    const z = halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      clippingMaterial
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    this._clippingBrushes.x = clippingBrush;
  }

  private createClippingBrushZ() {
    const {
      obb: { halfSize },
    } = this.layoutGroup;

    const width = halfSize.x * 2 + PAD;
    const height = halfSize.y * 2 + PAD;
    const depth = halfSize.z + PAD;

    const x = 0;
    const y = halfSize.y;
    const z = depth / 2 + halfSize.z;

    const clippingBrush = new Brush(
      new BoxGeometry(width, height, depth),
      clippingMaterial
    );
    clippingBrush.position.set(x, y, z);
    clippingBrush.updateMatrixWorld();

    this._clippingBrushes.z = clippingBrush;
  }

  private createClippingBrushXZ() {
    if (!this._clippingBrushes.x || !this._clippingBrushes.z) return;

    console.log(`xz go`);

    this._clippingBrushes.xz = this._evaluator.evaluate(
      this._clippingBrushes.x,
      this._clippingBrushes.z,
      ADDITION
    );
  }

  private destroyClippedBrushes() {
    this.layoutGroup.traverse((node) => {
      if (node instanceof ClippedElementBrush) {
        node.removeFromParent();
      }
    });
  }

  private createClippedBrushes(clippingBrush: Brush) {
    this.layoutGroup.traverse((node) => {
      if (isModuleGroup(node)) {
        node.createClippedBrushes(clippingBrush);
      }
    });
  }

  private showClippedBrushes() {
    this.layoutGroup.traverse((node) => {
      if (node instanceof FullElementBrush) {
        node.visible = false;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = true;
      }
    });
  }

  debugClippingBrush() {
    this.createClippingBrushX();
    this.createClippingBrushZ();
    this.createClippingBrushXZ();

    const scene = this.layoutGroup.scene;

    const brush = this._clippingBrushes.xz;

    if (!brush) return;

    // if (!scene.children.includes(brush)) scene.add(brush);
    // else brush.visible = !brush.visible;

    this.createClippedBrushes(brush);
    this.showClippedBrushes();
  }
}

export default CutsManager2;
