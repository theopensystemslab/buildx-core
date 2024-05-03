import { BuildModule } from "@/build-systems/remote/modules";
import { PositionedRow } from "@/layouts/types";
import { getVanillaModule } from "@/tasks/vanilla";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { Brush, Evaluator } from "three-bvh-csg";
import { isClippedBrush, isElementBrush } from "./ElementGroup";
import { defaultModuleGroupCreator, isModuleGroup } from "./ModuleGroup";

export type GridGroupUserData = {
  levelIndex: number;
  depth: number;
  height: number;
};

export class GridGroup extends Group {
  userData: GridGroupUserData;
  evaluator: Evaluator;
  vanillaModule: BuildModule;

  constructor({
    vanillaModule,
    ...userData
  }: GridGroupUserData & { vanillaModule: BuildModule }) {
    super();
    this.userData = userData;
    this.evaluator = new Evaluator();
    this.vanillaModule = vanillaModule;
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
    TE.chain((moduleGroups) =>
      pipe(
        moduleGroups,
        A.head,
        TE.fromOption(() => Error(`no moduleGroups in createGridGroup`)),
        TE.chain(
          ({
            userData: {
              systemId,
              structuredDna: { sectionType, positionType, levelType, gridType },
            },
          }) =>
            getVanillaModule({
              systemId,
              sectionType,
              positionType,
              levelType,
              gridType,
            })
        ),
        TE.map((vanillaModule) => {
          const gridGroup = new GridGroup({
            levelIndex,
            depth: moduleGroups.reduce((acc, v) => acc + v.userData.length, 0),
            height: positionedModules[0].module.height,
            vanillaModule,
          });
          gridGroup.add(...moduleGroups);
          gridGroup.position.setY(y);
          return gridGroup;
        })
      )
    )
  );
