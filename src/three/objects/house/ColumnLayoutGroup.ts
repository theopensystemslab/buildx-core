import { columnLayoutToLevelTypes } from "@/layouts/ops";
import { Column, ColumnLayout } from "@/layouts/types";
import { VanillaColumnsKey } from "@/layouts/vanillaColumns";
import { A, O, TE, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Box3, Group } from "three";
import { Brush } from "three-bvh-csg";
import { OBB } from "three-stdlib";
import { UserDataTypeEnum } from "../types";
import { createColumnGroup } from "./ColumnGroup";
import { isClippedBrush, isElementBrush } from "./ElementGroup";
import { isModuleGroup } from "./ModuleGroup";

export type ColumnLayoutGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ColumnLayoutGroup;
  dnas: string[]; // houseTransformsGroup: HouseTransformsGroup;
  layout: ColumnLayout;
  vanillaColumn: Column;
  levelTypes: string[];
  height: number;
  length: number;
  width: number;
  sectionType: string;
};

class ColumnLayoutGroup extends Group {
  userData: ColumnLayoutGroupUserData;
  aabb: Box3;
  obb: OBB;

  constructor(userData: ColumnLayoutGroupUserData) {
    super();
    this.userData = userData;
    this.aabb = new Box3();
    this.obb = new OBB();
  }

  createClippedBrushes(clippingBrush: Brush) {
    this.destroyClippedBrushes();

    this.traverse((node) => {
      if (isModuleGroup(node)) {
        node.createClippedBrushes(clippingBrush);
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

export const createColumnLayoutGroup = ({
  systemId,
  dnas,
  layout,
  vanillaColumnGetter = () => TE.of(undefined as any),
}: {
  systemId: string;
  dnas: string[];
  layout: ColumnLayout;
  vanillaColumnGetter?: (
    key: VanillaColumnsKey
  ) => TE.TaskEither<Error, Column>;
}) =>
  pipe(
    layout,
    A.traverseWithIndex(TE.ApplicativeSeq)(
      (i, { positionedRows, z, columnIndex }) => {
        const startColumn = i === 0;
        const endColumn = i === layout.length - 1;

        return pipe(
          createColumnGroup({
            positionedRows,
            startColumn,
            endColumn,
            columnIndex,
          }),
          TE.map((columnGroup) => {
            columnGroup.position.set(0, 0, z);
            return columnGroup;
          })
        );
      }
    ),
    TE.flatMap((columnGroups) => {
      const firstColumn = pipe(
        layout,
        A.head,
        someOrError(`could not head column`)
      );

      const firstModule = pipe(
        firstColumn,
        ({ positionedRows }) => pipe(positionedRows, A.head),
        O.chain(({ positionedModules }) => pipe(positionedModules, A.head)),
        O.map(({ module }) => module),
        someOrError(`could not head module`)
      );

      const {
        structuredDna: { sectionType },
        width,
      } = firstModule;

      const height = firstColumn.positionedRows.reduce(
        (acc, v) => acc + v.positionedModules[0].module.height,
        0
      );
      const length = columnGroups.reduce(
        (acc, columnGroup) => acc + columnGroup.userData.length,
        0
      );

      const levelTypes = columnLayoutToLevelTypes(layout);

      return pipe(
        vanillaColumnGetter({ systemId, sectionType, levelTypes }),
        TE.map((vanillaColumn) => {
          const userData: ColumnLayoutGroupUserData = {
            type: UserDataTypeEnum.Enum.ColumnLayoutGroup,
            dnas,
            layout,
            sectionType,
            levelTypes,
            width,
            height,
            length,
            vanillaColumn,
          };

          const columnLayoutGroup = new ColumnLayoutGroup(userData);
          columnLayoutGroup.add(...columnGroups);
          return columnLayoutGroup;
        })
      );
    })
  );
