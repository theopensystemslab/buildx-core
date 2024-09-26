import { ThreeMaterial } from "@/three/materials/types";
import { hideObject, showObject } from "@/three/utils/layers";
import { BufferGeometry, Group, NormalBufferAttributes } from "three";
import { Brush, SUBTRACTION } from "three-bvh-csg";
import { ScopeElement } from "../types";
import { ColumnGroup } from "./ColumnGroup";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { HouseGroup } from "./HouseGroup";
import { ModuleGroup } from "./ModuleGroup";
import { RowGroup } from "./RowGroup";
import { evaluator } from "@/three/managers/CutsManager";
import BuildXScene from "../scene/BuildXScene";
import { BuildElement } from "@/data/build-systems";
import { O } from "@/utils/functions";

export class ElementGroup extends Group {
  userData: {
    element: BuildElement;
  };
  fullBrush: FullElementBrush;
  clippedBrush?: ClippedElementBrush;

  constructor(element: BuildElement, fullBrush: FullElementBrush) {
    super();
    this.userData = {
      element,
    };
    this.fullBrush = fullBrush;
  }

  createClippedBrush(clippingBrush: Brush) {
    if (!this.fullBrush) return;

    if (this.clippedBrush) {
      this.clippedBrush.removeFromParent();
    }

    this.clippedBrush = new ClippedElementBrush();
    hideObject(this.clippedBrush);
    this.add(this.clippedBrush);

    this.fullBrush.updateMatrixWorld();

    evaluator.evaluate(
      this.fullBrush,
      clippingBrush,
      SUBTRACTION,
      this.clippedBrush
    );

    this.clippedBrush.geometry.applyMatrix4(this.matrixWorld.invert());
    this.clippedBrush.updateMatrixWorld();
  }

  showClippedBrush() {
    if (this.clippedBrush) {
      showObject(this.clippedBrush);
      hideObject(this.fullBrush);
    }
  }

  showFullBrush() {
    showObject(this.fullBrush);
    if (this.clippedBrush) {
      hideObject(this.clippedBrush);
    }
  }

  get moduleGroup(): ModuleGroup {
    if (this.parent instanceof ModuleGroup) return this.parent;
    else throw new Error(`get moduleGroup failed`);
  }

  get rowGroup(): RowGroup {
    return this.moduleGroup.rowGroup;
  }

  get columnGroup(): ColumnGroup {
    return this.rowGroup.columnGroup;
  }

  get columnLayoutGroup(): ColumnLayoutGroup {
    return this.columnGroup.columnLayoutGroup;
  }

  get houseGroup(): HouseGroup {
    return this.columnLayoutGroup.houseGroup;
  }

  get scene(): BuildXScene {
    return this.houseGroup.scene;
  }

  getVisibleBrush(): O.Option<ElementBrush> {
    if (this.clippedBrush && this.clippedBrush.visible) {
      return O.some(this.clippedBrush);
    } else if (this.fullBrush && this.fullBrush.visible) {
      return O.some(this.fullBrush);
    } else {
      return O.none;
    }
  }
}

export class ElementBrush extends Brush {
  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
  }

  get elementGroup(): ElementGroup {
    if (this.parent instanceof ElementGroup) {
      return this.parent;
    } else {
      throw new Error(`get elementGroup failed`);
    }
  }

  get moduleGroup(): ModuleGroup {
    return this.elementGroup.moduleGroup;
  }

  get rowGroup(): RowGroup {
    return this.moduleGroup.rowGroup;
  }

  get columnGroup(): ColumnGroup {
    return this.rowGroup.columnGroup;
  }

  get columnLayoutGroup(): ColumnLayoutGroup {
    return this.columnGroup.columnLayoutGroup;
  }

  get houseGroup(): HouseGroup {
    return this.columnLayoutGroup.houseGroup;
  }

  get scopeElement(): ScopeElement {
    const {
      moduleIndex,
      module: { dna },
    } = this.moduleGroup.userData;
    const {
      userData: { houseId },
    } = this.houseGroup;
    const { columnIndex } = this.columnGroup.userData;
    const { rowIndex } = this.rowGroup.userData;
    const elementGroup = this.elementGroup;
    const {
      userData: {
        element: { ifcTag },
      },
    } = elementGroup;

    return {
      houseId,
      columnIndex,
      rowIndex,
      moduleIndex,
      dna,
      elementGroup,
      ifcTag,
    };
  }
}

export class FullElementBrush extends ElementBrush {
  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
  }
}

export class ClippedElementBrush extends ElementBrush {
  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
  }
}

export const defaultElementGroupCreator = ({
  geometry,
  threeMaterial,
  element,
}: {
  geometry: BufferGeometry<NormalBufferAttributes>;
  threeMaterial: ThreeMaterial;
  element: BuildElement;
}): ElementGroup => {
  geometry.computeVertexNormals();
  const fullElementBrush = new FullElementBrush(geometry, threeMaterial);
  fullElementBrush.castShadow = true;
  const elementGroup = new ElementGroup(element, fullElementBrush);
  elementGroup.add(fullElementBrush);
  return elementGroup;
};
