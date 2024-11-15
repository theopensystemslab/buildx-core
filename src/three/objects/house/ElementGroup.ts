import { BuildElement } from "@/data/build-systems";
import { evaluator } from "@/three/managers/CutsManager";
import { ThreeMaterial } from "@/three/materials/types";
import { hideObject, showObject } from "@/three/utils/layers";
import { O } from "@/utils/functions";
import {
  BoxGeometry,
  BufferGeometry,
  Group,
  NormalBufferAttributes,
} from "three";
import { Brush, SUBTRACTION } from "three-bvh-csg";
import BuildXScene from "../scene/BuildXScene";
import { ScopeElement } from "../types";
import { ColumnGroup } from "./ColumnGroup";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { HouseGroup } from "./HouseGroup";
import { ModuleGroup } from "./ModuleGroup";
import { RowGroup } from "./RowGroup";

let debuggingUuid: string | null = null;

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

  private logBrushDetails(brush: Brush, label: string = "") {
    console.log(`=== Brush Details ${label} ===`);
    console.log("Position:", {
      x: brush.position.x,
      y: brush.position.y,
      z: brush.position.z,
    });
    console.log("Rotation:", {
      x: brush.rotation.x,
      y: brush.rotation.y,
      z: brush.rotation.z,
    });
    console.log("Scale:", {
      x: brush.scale.x,
      y: brush.scale.y,
      z: brush.scale.z,
    });
    console.log("Matrix:", brush.matrix.elements);

    if (brush.geometry instanceof BoxGeometry) {
      const parameters = brush.geometry.parameters;
      console.log("Geometry parameters:", {
        width: parameters.width,
        height: parameters.height,
        depth: parameters.depth,
      });
    } else {
      console.log("Geometry type:", brush.geometry.constructor.name);
      console.log("Geometry bounds:", brush.geometry.boundingBox);
    }
  }

  createClippedBrush(clippingBrush: Brush) {
    if (!this.fullBrush) return;

    const dna = "XXS-MID-R2-GRID2-01-ST0-L0-SIDE0-SIDE0-END0-TOP0";

    const shouldLog =
      this.userData.element.category === "Structure" &&
      this.moduleGroup.userData.module.dna === dna;

    if (shouldLog && debuggingUuid === null) {
      debuggingUuid = this.uuid;
    }

    const debug = debuggingUuid === this.uuid;

    if (debug) {
      console.log(
        `=== Creating Clipped Brush for ElementGroup ${this.uuid} ===`
      );
      console.log(this.userData.element);
      this.logBrushDetails(this.fullBrush, "Full Brush");
      this.logBrushDetails(clippingBrush, "Clipping Brush");
    }

    if (this.clippedBrush) {
      this.clippedBrush.removeFromParent();
    }

    this.clippedBrush = new ClippedElementBrush();
    hideObject(this.clippedBrush);
    this.add(this.clippedBrush);

    this.fullBrush.updateMatrixWorld();

    if (debug) {
      console.log(
        "Before CSG operation - Element Matrix World:",
        this.matrixWorld.elements
      );
    }

    evaluator.evaluate(
      this.fullBrush,
      clippingBrush,
      SUBTRACTION,
      this.clippedBrush
    );

    if (debug) {
      this.logBrushDetails(this.clippedBrush, "After CSG");
    }

    this.clippedBrush.geometry.applyMatrix4(this.matrixWorld.invert());

    if (debug) {
      this.logBrushDetails(this.clippedBrush, "Final State");
    }

    this.clippedBrush.updateMatrixWorld();
    this.clippedBrush.geometry.computeVertexNormals();
    this.clippedBrush.castShadow = true;
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

  get scene(): BuildXScene | null {
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
