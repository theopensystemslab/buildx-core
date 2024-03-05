import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { ColumnLayout, PositionedRow } from "../../../../db/layouts";
import { A, T } from "../../../../utils/functions";
import { GridGroupUserData, UserDataTypeEnum } from "./types";
import { GridGroup } from "./GridGroup";
import createModuleGroup from "./createModuleGroup";

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

export const createColumnGroup =
  ({
    positionedRows,
    columnIndex,
    startColumn = false,
    endColumn = false,
    // houseTransformsGroup,
  }: {
    positionedRows: PositionedRow[];
    columnIndex: number;
    startColumn?: boolean;
    endColumn?: boolean;
    // houseTransformsGroup: HouseTransformsGroup;
  }): T.Task<ColumnGroup> =>
  async () => {
    const columnGroup = new ColumnGroup();

    for (let { positionedModules, y, levelIndex } of positionedRows) {
      const gridGroup = new GridGroup();
      let length = 0;

      for (let {
        z,
        module,
        moduleIndex: gridGroupIndex,
      } of positionedModules) {
        const moduleGroup = await createModuleGroup({
          module,
          gridGroupIndex,
          z,
          flip: endColumn,

          // visible: true,
          // houseTransformsGroup,
        })();

        gridGroup.position.setY(y);
        gridGroup.add(moduleGroup);

        length += module.length;
      }

      const gridGroupUserData: GridGroupUserData = {
        type: UserDataTypeEnum.Enum.GridGroup,
        levelIndex,
        length,
        height: positionedModules[0].module.height,
      };
      gridGroup.userData = gridGroupUserData;

      columnGroup.add(gridGroup);
    }

    const columnGroupUserData: ColumnGroupUserData = {
      type: UserDataTypeEnum.Enum.ColumnGroup,
      columnIndex,
      length: positionedRows[0].rowLength,
      startColumn,
      endColumn,
    };

    columnGroup.userData = columnGroupUserData;

    return columnGroup as ColumnGroup;
  };

export const createColumnGroups = ({
  systemId,
  houseId,
  houseLayout,
  houseTransformsGroup,
}: {
  systemId: string;
  houseId: string;
  houseTransformsGroup: HouseTransformsGroup;
  houseLayout: ColumnLayout;
}): T.Task<ColumnGroup[]> =>
  pipe(
    houseLayout,
    A.traverseWithIndex(T.ApplicativeSeq)(
      (i, { positionedRows, z, columnIndex }) => {
        const startColumn = i === 0;
        const endColumn = i === houseLayout.length - 1;

        const task = createColumnGroup({
          systemId,
          houseId,
          positionedRows,
          startColumn,
          endColumn,
          columnIndex,
          houseTransformsGroup,
        });

        return pipe(
          task,
          T.map(columnGroup => {
            columnGroup.position.set(0, 0, z);
            return columnGroup;
          })
        );
      }
    )
  );
