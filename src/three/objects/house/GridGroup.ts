import { PositionedRow } from "@/layouts/types";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, T } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { Brush, Evaluator } from "three-bvh-csg";
import { isClippedBrush, isElementBrush } from "./ElementGroup";
import createModuleGroup, { isModuleGroup } from "./ModuleGroup";
import { UserDataTypeEnum } from "../types";

export type GridGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.GridGroup;
  levelIndex: number;
  length: number;
  height: number;
};

export class GridGroup extends Group {
  userData: GridGroupUserData;
  evaluator: Evaluator;

  constructor(userData: GridGroupUserData) {
    super();
    this.userData = userData;
    this.evaluator = new Evaluator();
  }

  createLevelCutBrushes(clippingBrush: Brush) {
    this.destroyClippedBrushes();

    this.traverse((node) => {
      if (isModuleGroup(node)) {
        node.createLevelCutBrushes(clippingBrush);
      }
    });
  }

  showClippedBrushes() {
    this.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = false;
      } else if (isClippedBrush(node)) {
        node.visible = true;
      }
    });
  }

  destroyClippedBrushes() {
    this.traverse((node) => {
      if (isClippedBrush(node)) {
        node.removeFromParent();
      }
    });
  }

  showElementBrushes() {
    this.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = true;
      } else if (isClippedBrush(node)) {
        node.visible = false;
      }
    });
  }
}

export const createGridGroup = ({
  positionedModules,
  levelIndex,
  y,
  ...defaultGetters
}: DefaultGetters & PositionedRow): T.Task<GridGroup> =>
  pipe(
    positionedModules,
    A.traverse(T.ApplicativeSeq)(({ module, moduleIndex: gridGroupIndex, z }) =>
      createModuleGroup({
        buildModule: module,
        gridGroupIndex,
        z,
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
