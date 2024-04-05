import { PositionedRow } from "@/layouts/types";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { UserDataTypeEnum } from "../types";
import { createGridGroup } from "./GridGroup";

export type ColumnGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ColumnGroup;
  columnIndex: number;
  length: number;
  startColumn?: boolean;
  endColumn?: boolean;
};

export class ColumnGroup extends Group {
  userData: ColumnGroupUserData;

  constructor(userData: ColumnGroupUserData) {
    super();
    this.userData = userData;
  }
}

export const createColumnGroup = ({
  positionedRows,
  columnIndex,
  startColumn = false,
  endColumn = false,
}: {
  positionedRows: PositionedRow[];
  columnIndex: number;
  startColumn?: boolean;
  endColumn?: boolean;
}): TE.TaskEither<Error, ColumnGroup> =>
  pipe(
    positionedRows,
    A.traverse(TE.ApplicativeSeq)((positionedRow) =>
      createGridGroup({
        ...positionedRow,
        endColumn,
      })
    ),
    TE.map((gridGroups) => {
      const columnGroupUserData: ColumnGroupUserData = {
        type: UserDataTypeEnum.Enum.ColumnGroup,
        columnIndex,
        length: positionedRows[0].rowLength,
        startColumn,
        endColumn,
      };

      const columnGroup = new ColumnGroup(columnGroupUserData);

      columnGroup.add(...gridGroups);

      return columnGroup as ColumnGroup;
    })
  );
