import { BuildElement } from "@/systemsData/elements";
import {
  BufferGeometry,
  Group,
  Material,
  NormalBufferAttributes,
  Object3D,
} from "three";
import { Brush } from "three-bvh-csg";
import { UserDataTypeEnum } from "../types";

export const isElementGroup = (node: Object3D): node is ElementGroup =>
  node.userData?.type === UserDataTypeEnum.Enum.ElementGroup;

export type ElementGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ElementGroup;
  ifcTag: string;
  category: string;
};

export class ElementGroup extends Group {
  userData: ElementGroupUserData;

  constructor(userData: ElementGroupUserData) {
    super();
    this.userData = userData;
  }
}

export const isElementBrush = (node: Object3D): node is ElementBrush =>
  node.userData?.type === UserDataTypeEnum.Enum.ElementBrush;

type ElementBrushUserData = {
  type: typeof UserDataTypeEnum.Enum.ElementBrush;
};

export class ElementBrush extends Brush {
  userData: ElementBrushUserData;

  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
    this.userData = {
      type: UserDataTypeEnum.Enum.ElementBrush,
    };
  }
}

export const isClippedBrush = (node: Object3D): node is ClippedBrush =>
  node.userData?.type === UserDataTypeEnum.Enum.ClippedBrush;

type ClippedBrushUserData = {
  type: typeof UserDataTypeEnum.Enum.ClippedBrush;
};

export class ClippedBrush extends Brush {
  userData: ClippedBrushUserData;

  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
    this.userData = {
      type: UserDataTypeEnum.Enum.ClippedBrush,
    };
  }
}

const createElementGroup = ({
  ifcTag,
  geometry,
  material,
  element,
}: {
  systemId: string;
  ifcTag: string;
  geometry: BufferGeometry<NormalBufferAttributes>;
  material: Material;
  element: BuildElement;
}): ElementGroup => {
  const elementBrush = new ElementBrush(geometry, material);

  const elementGroup = new ElementGroup({
    type: UserDataTypeEnum.Enum.ElementGroup,
    ifcTag,
    category: element.category,
  });

  elementGroup.add(elementBrush);

  return elementGroup;
};

export default createElementGroup;
