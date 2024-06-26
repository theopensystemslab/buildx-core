import { PositionedRow } from "@/layouts/types";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { Brush, Evaluator } from "three-bvh-csg";
import { UserDataTypeEnum } from "../types";
import { isClippedBrush, isElementBrush } from "./ElementGroup";
import { defaultModuleGroupCreator, isModuleGroup } from "./ModuleGroup";

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

  createClippedBrushes(clippingBrush: Brush) {
    this.destroyClippedBrushes();

    this.children.filter(isModuleGroup).forEach((moduleGroup) => {
      moduleGroup.createClippedBrushes(clippingBrush);
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

export const defaultGridGroupCreator = ({
  positionedModules,
  levelIndex,
  y,
  endColumn,
  createModuleGroup = defaultModuleGroupCreator,
}: PositionedRow & {
  endColumn: boolean;
  createModuleGroup?: typeof defaultModuleGroupCreator;
}): TE.TaskEither<Error, GridGroup> =>
  pipe(
    positionedModules,
    A.traverse(TE.ApplicativeSeq)(
      ({ module, moduleIndex: gridGroupIndex, z }) =>
        createModuleGroup({
          buildModule: module,
          gridGroupIndex,
          z,
          flip: endColumn,
        })
    ),
    TE.map((moduleGroups) => {
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
