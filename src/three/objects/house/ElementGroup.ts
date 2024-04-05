import { BuildElement } from "@/build-systems/remote/elements";
import { ThreeMaterial } from "@/three/materials/types";
import { BufferGeometry, Group, NormalBufferAttributes, Object3D } from "three";
import { Brush } from "three-bvh-csg";
import { UserDataTypeEnum } from "../types";

export const isElementGroup = (node: Object3D): node is ElementGroup =>
  node.userData?.type === UserDataTypeEnum.Enum.ElementGroup;

export type ElementGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ElementGroup;
};

export class ElementGroup extends Group {
  userData: ElementGroupUserData;
  element: BuildElement;

  constructor(element: BuildElement) {
    super();
    this.userData = {
      type: UserDataTypeEnum.Enum.ElementGroup,
    };
    this.element = element;
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

export const isClippedBrush = (node: Object3D): node is ClippedElementBrush =>
  node.userData?.type === UserDataTypeEnum.Enum.ClippedElementBrush;

type ClippedBrushUserData = {
  type: typeof UserDataTypeEnum.Enum.ClippedElementBrush;
};

export class ClippedElementBrush extends Brush {
  userData: ClippedBrushUserData;

  constructor(...args: ConstructorParameters<typeof Brush>) {
    super(...args);
    this.userData = {
      type: UserDataTypeEnum.Enum.ClippedElementBrush,
    };
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
  const elementBrush = new ElementBrush(geometry, threeMaterial);
  const elementGroup = new ElementGroup(element);
  elementGroup.add(elementBrush);
  return elementGroup;
};
