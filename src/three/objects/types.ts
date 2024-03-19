import { z } from "zod";

export const UserDataTypeEnum = z.enum([
  // "HouseTransformsGroup",
  // "HouseTransformsHandlesGroup",
  // "HouseLayoutGroup",
  "ColumnGroup",
  // // layout group handles go in start/end column groups
  // //   this is a special case for stretch Z handles
  "GridGroup",
  "ModuleGroup",
  "ElementGroup",
  "ElementBrush",
  "ClippedBrush",
  // "ElementMesh",
  // "StretchHandleGroup",
  // "StretchHandleMesh",
  // "RotateHandlesGroup",
  // "RotateHandleMesh",
]);

export type UserDataTypeEnum = z.infer<typeof UserDataTypeEnum>;

export type ElementGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ElementGroup;
  ifcTag: string;
  category: string;
};
