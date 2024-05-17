import { ElementGroup } from "./house/ElementGroup";

export type ScopeElement = {
  ifcTag: string;
  dna: string;
  columnIndex: number;
  rowIndex: number;
  moduleIndex: number;
  houseId: string;
  elementGroup: ElementGroup;
};
