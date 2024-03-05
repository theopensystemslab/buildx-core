import { z } from "zod";

export const UserDataTypeEnum = z.enum([
  // "HouseTransformsGroup",
  // "HouseTransformsHandlesGroup",
  // "HouseLayoutGroup",
  // "ColumnGroup",
  // // layout group handles go in start/end column groups
  // //   this is a special case for stretch Z handles
  // "GridGroup",
  "ModuleGroup",
  "ElementMesh",
  // "StretchHandleGroup",
  // "StretchHandleMesh",
  // "RotateHandlesGroup",
  // "RotateHandleMesh",
]);

export type UserDataTypeEnum = z.infer<typeof UserDataTypeEnum>;

export type ModuleGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ModuleGroup;
  gridGroupIndex: number;
  dna: string;
  length: number;
  z: number;
};

export type ElementMeshUserData = {
  type: typeof UserDataTypeEnum.Enum.ElementMesh;
  ifcTag: string;
  category: string;
};
