import { BuildModule } from "@/systemsData/modules";

export type PositionedBuildModule = {
  module: BuildModule;
  z: number;
  moduleIndex: number;
};

export type Row = {
  positionedModules: Array<PositionedBuildModule>;
  levelType: string;
  gridUnits: number;
  rowLength: number;
  // is this best here, or best in our scene graph?
  // vanillaModule: BuildModule;
};

export type PositionedRow = Row & {
  levelIndex: number;
  y: number;
};

export type Column = {
  positionedRows: Array<PositionedRow>;
  columnLength: number;
};

export type PositionedColumn = Column & {
  z: number;
  columnIndex: number;
};

export type RowLayout = Array<PositionedRow>;
export type ColumnLayout = Array<PositionedColumn>;
