import { BuildElement } from "@/build-systems/remote/elements";
import { ThreeMaterial } from "@/three/materials/types";
import { BufferGeometry, Group, NormalBufferAttributes } from "three";
import { Brush } from "three-bvh-csg";
import { ModuleGroup } from "./ModuleGroup";

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
}

export class ElementBrush extends Brush {
  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
  }

  getModuleGroup(): ModuleGroup {
    if (this.parent?.parent instanceof ModuleGroup) {
      return this.parent.parent;
    } else {
      throw new Error(`getModuleGroup failed`);
    }
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
