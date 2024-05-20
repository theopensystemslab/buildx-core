import { ElementGroup } from "./house/ElementGroup";

export type ScopeElement = {
  ifcTag: string;
  dna: string;
  columnIndex: number;
  levelIndex: number;
  moduleIndex: number;
  houseId: string;
  object: ElementGroup;
};
