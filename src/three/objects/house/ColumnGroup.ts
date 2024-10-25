import { PositionedRow } from "@/layouts/types";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { HouseGroup } from "./HouseGroup";
import { ModuleGroup } from "./ModuleGroup";
import { defaultRowGroupCreator } from "./RowGroup";

export type ColumnGroupUserData = {
  columnIndex: number;
  // I've just added these two props:
  width: number;
  height: number;
  depth: number;
  startColumn?: boolean;
  endColumn?: boolean;
};

export class ColumnGroup extends Group {
  userData: ColumnGroupUserData;

  constructor(userData: ColumnGroupUserData) {
    super();
    this.userData = userData;
  }

  get columnLayoutGroup(): ColumnLayoutGroup {
    if (this.parent instanceof ColumnLayoutGroup) return this.parent;
    throw new Error(`get columnLayoutGroup failed`);
  }

  get houseGroup(): HouseGroup {
    return this.columnLayoutGroup.houseGroup;
  }

  show() {
    this.visible = true;
    this.traverse((x) => {
      if (x instanceof ModuleGroup) {
        x.show();
      }
    });
  }

  hide() {
    this.visible = false;
    this.traverse((x) => {
      if (x instanceof ModuleGroup) {
        x.hide();
      }
    });
  }
}

export const defaultColumnGroupCreator = ({
  positionedRows,
  columnIndex,
  startColumn = false,
  endColumn = false,
  createRowGroup = defaultRowGroupCreator,
}: {
  positionedRows: PositionedRow[];
  columnIndex: number;
  startColumn?: boolean;
  endColumn?: boolean;
  createRowGroup?: typeof defaultRowGroupCreator;
}): TE.TaskEither<Error, ColumnGroup> =>
  pipe(
    positionedRows,
    A.traverse(TE.ApplicativePar)((positionedRow) =>
      createRowGroup({
        ...positionedRow,
        endColumn,
      })
    ),
    TE.map((rowGroups) => {
      const columnGroupUserData: ColumnGroupUserData = {
        columnIndex,
        depth: positionedRows[0].rowDepth,
        width: positionedRows[0].rowWidth,
        height: positionedRows.reduce((acc, v) => acc + v.rowHeight, 0),
        startColumn,
        endColumn,
      };

      const columnGroup = new ColumnGroup(columnGroupUserData);

      columnGroup.add(...rowGroups);

      return columnGroup as ColumnGroup;
    })
  );
