import { BuildModule } from "@/data/build-systems";

export type PositionedBuildModule = {
  module: BuildModule;
  z: number;
  moduleIndex: number;
};

export type Row = {
  positionedModules: Array<PositionedBuildModule>;
  levelType: string;
  gridUnits: number;
  rowDepth: number;
};

export type PositionedRow = Row & {
  rowIndex: number;
  y: number;
};

export type Column = {
  positionedRows: Array<PositionedRow>;
  columnDepth: number;
};

export type PositionedColumn = Column & {
  z: number;
  columnIndex: number;
};

export type RowLayout = Array<PositionedRow>;
export type ColumnLayout = Array<PositionedColumn>;
