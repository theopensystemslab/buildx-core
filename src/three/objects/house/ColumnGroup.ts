import { PositionedRow } from "@/layouts/types";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { UserDataTypeEnum } from "../types";
import { defaultGridGroupCreator } from "./GridGroup";

export type ColumnGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ColumnGroup;
  columnIndex: number;
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
}

export const defaultColumnGroupCreator = ({
  positionedRows,
  columnIndex,
  startColumn = false,
  endColumn = false,
  createGridGroup = defaultGridGroupCreator,
}: {
  positionedRows: PositionedRow[];
  columnIndex: number;
  startColumn?: boolean;
  endColumn?: boolean;
  createGridGroup?: typeof defaultGridGroupCreator;
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
        depth: positionedRows[0].rowDepth,
        startColumn,
        endColumn,
      };

      const columnGroup = new ColumnGroup(columnGroupUserData);

      columnGroup.add(...gridGroups);

      return columnGroup as ColumnGroup;
    })
  );
