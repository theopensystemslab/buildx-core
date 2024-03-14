import { PositionedRow } from "@/layouts/types";
import { DefaultGetters } from "@/tasks/defaultory";
import { Group } from "three";
import createModuleGroup, { ModuleGroup } from "./ModuleGroup";
import { UserDataTypeEnum } from "./types";

export type GridGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.GridGroup;
  levelIndex: number;
  length: number;
  height: number;
};

export class GridGroup extends Group {
  userData: GridGroupUserData;

  constructor(userData: GridGroupUserData) {
    super();
    this.userData = userData;
  }
}

export const createGridGroup = async ({
  positionedModules,
  levelIndex,
  y,
  flip,
  ...defaultGetters
}: DefaultGetters &
  PositionedRow & {
    flip: boolean;
  }) => {
  let length = 0;

  const moduleGroups: ModuleGroup[] = [];

  for (const { z, module, moduleIndex: gridGroupIndex } of positionedModules) {
    const moduleGroup = await createModuleGroup({
      module,
      gridGroupIndex,
      z,
      flip,
      ...defaultGetters,
    });

    moduleGroups.push(moduleGroup);

    length += module.length;
  }

  const gridGroup = new GridGroup({
    type: UserDataTypeEnum.Enum.GridGroup,
    levelIndex,
    length,
    height: positionedModules[0].module.height,
  });

  gridGroup.add(...moduleGroups);
  gridGroup.position.setY(y);

  return gridGroup;
};
