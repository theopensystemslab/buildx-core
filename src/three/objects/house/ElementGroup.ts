import { BuildElement } from "@/build-systems/remote/elements";
import { ThreeMaterial } from "@/three/materials/types";
import { BufferGeometry, Group, NormalBufferAttributes } from "three";
import { Brush } from "three-bvh-csg";
import { ModuleGroup } from "./ModuleGroup";
import { ScopeElement } from "../types";
import { RowGroup } from "./RowGroup";
import { ColumnGroup } from "./ColumnGroup";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { HouseGroup } from "./HouseGroup";

export class ElementGroup extends Group {
  userData: {
    element: BuildElement;
  };

  constructor(element: BuildElement) {
    super();

    this.userData = {
      element,
    };
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
  const elementBrush = new FullElementBrush(geometry, threeMaterial);
  const elementGroup = new ElementGroup(element);
  elementGroup.add(elementBrush);
  return elementGroup;
};
