import { PositionedRow } from "@/layouts/types";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, T } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Operation } from "three-bvh-csg";
import createModuleGroup from "./ModuleGroup";
import { UserDataTypeEnum } from "./types";

export type GridGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.GridGroup;
  levelIndex: number;
  length: number;
  height: number;
};

export class GridGroup extends Operation {
  userData: GridGroupUserData;

  constructor(userData: GridGroupUserData) {
    super();
    this.userData = userData;
  }
}

export const createGridGroup = ({
  positionedModules,
  levelIndex,
  y,
  flip,
  ...defaultGetters
}: DefaultGetters &
  PositionedRow & {
    flip: boolean;
  }): T.Task<GridGroup> =>
  pipe(
    positionedModules,
    A.traverse(T.ApplicativeSeq)(({ module, moduleIndex: gridGroupIndex, z }) =>
      createModuleGroup({
        buildModule: module,
        gridGroupIndex,
        z,
        flip,
        ...defaultGetters,
      })
    ),
    T.map((moduleGroups) => {
      const gridGroup = new GridGroup({
        type: UserDataTypeEnum.Enum.GridGroup,
        levelIndex,
        length: moduleGroups.reduce((acc, v) => acc + v.userData.length, 0),
        height: positionedModules[0].module.height,
      });
      gridGroup.add(...moduleGroups);
      gridGroup.position.setY(y);
      return gridGroup;
    })
  );
