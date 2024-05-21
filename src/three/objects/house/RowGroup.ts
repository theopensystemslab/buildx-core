import { BuildModule } from "@/build-systems/remote/modules";
import { PositionedRow } from "@/layouts/types";
import { getVanillaModule } from "@/tasks/vanilla";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import { Brush, Evaluator } from "three-bvh-csg";
import { ColumnGroup } from "./ColumnGroup";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { ClippedElementBrush, FullElementBrush } from "./ElementGroup";
import { HouseGroup } from "./HouseGroup";
import { defaultModuleGroupCreator, isModuleGroup } from "./ModuleGroup";

export type RowGroupUserData = {
  rowIndex: number;
  depth: number;
  height: number;
  vanillaModule: BuildModule;
};

export class RowGroup extends Group {
  userData: RowGroupUserData;
  evaluator: Evaluator;

  constructor(userData: RowGroupUserData) {
    super();
    this.userData = userData;
    this.evaluator = new Evaluator();
  }

  get columnGroup(): ColumnGroup {
    if (this.parent instanceof ColumnGroup) return this.parent;
    throw new Error(`get columnGroup failed`);
  }

  get columnLayoutGroup(): ColumnLayoutGroup {
    return this.columnGroup.columnLayoutGroup;
  }

  get houseGroup(): HouseGroup {
    return this.columnLayoutGroup.houseGroup;
  }

  createClippedBrushes(clippingBrush: Brush) {
    this.destroyClippedBrushes();

    this.children.filter(isModuleGroup).forEach((moduleGroup) => {
      moduleGroup.createClippedBrushes(clippingBrush);
    });
  }

  showClippedBrushes() {
    this.traverse((node) => {
      if (node instanceof FullElementBrush) {
        node.visible = false;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = true;
      }
    });
  }

  destroyClippedBrushes() {
    this.traverse((node) => {
      if (node instanceof ClippedElementBrush) {
        node.removeFromParent();
      }
    });
  }

  showElementBrushes() {
    this.traverse((node) => {
      if (node instanceof FullElementBrush) {
        node.visible = true;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = false;
      }
    });
  }
}

export const defaultRowGroupCreator = ({
  positionedModules,
  rowIndex,
  y,
  endColumn,
  createModuleGroup = defaultModuleGroupCreator,
}: PositionedRow & {
  endColumn: boolean;
  createModuleGroup?: typeof defaultModuleGroupCreator;
}): TE.TaskEither<Error, RowGroup> =>
  pipe(
    positionedModules,
    A.traverse(TE.ApplicativeSeq)(({ module, moduleIndex: moduleIndex, z }) =>
      createModuleGroup({
        buildModule: module,
        moduleIndex,
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
              module: {
                systemId,
                structuredDna: {
                  sectionType,
                  positionType,
                  levelType,
                  gridType,
                },
              },
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
          const gridGroup = new RowGroup({
            rowIndex: rowIndex,
            depth: moduleGroups.reduce(
              (acc, v) => acc + v.userData.module.length,
              0
            ),
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
