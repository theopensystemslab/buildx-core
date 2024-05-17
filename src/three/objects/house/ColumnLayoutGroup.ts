import { columnLayoutToLevelTypes } from "@/layouts/ops";
import { Column, ColumnLayout } from "@/layouts/types";
import { createVanillaColumn } from "@/tasks/vanilla";
import CutsManager from "@/three/managers/CutsManager";
import ZStretchManager2 from "@/three/managers/ZStretchManager2";
import { A, O, TE, someOrError } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Box3, Group } from "three";
import { OBB } from "three-stdlib";
import { UserDataTypeEnum } from "../types";
import { defaultColumnGroupCreator } from "./ColumnGroup";

export type ColumnLayoutGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ColumnLayoutGroup;
  dnas: string[];
  layout: ColumnLayout;
  levelTypes: string[];
  width: number;
  height: number;
  depth: number;
  sectionType: string;
  vanillaColumn: Column;
};

export class ColumnLayoutGroup extends Group {
  userData: ColumnLayoutGroupUserData;
  aabb: Box3;
  obb: OBB;
  cutsManager: CutsManager;
  zStretchManager: ZStretchManager2;

  constructor(userData: ColumnLayoutGroupUserData) {
    super();
    this.userData = userData;
    this.aabb = new Box3();
    this.obb = new OBB();
    this.cutsManager = new CutsManager(this);
    this.zStretchManager = new ZStretchManager2(this);
  }

  updateOBB() {
    const { width, height, depth } = this.userData;
    this.obb.halfSize.set(width / 2, height / 2, depth / 2);
  }
}

export const createColumnLayoutGroup = ({
  systemId,
  dnas,
  layout,
  createColumnGroup = defaultColumnGroupCreator,
}: {
  systemId: string;
  dnas: string[];
  layout: ColumnLayout;
  createColumnGroup?: typeof defaultColumnGroupCreator;
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
      const depth = columnGroups.reduce(
        (acc, columnGroup) => acc + columnGroup.userData.depth,
        0
      );

      const levelTypes = columnLayoutToLevelTypes(layout);

      return pipe(
        createVanillaColumn({
          systemId,
          levelTypes,
          sectionType,
        }),
        TE.map((vanillaColumn) => {
          const userData: ColumnLayoutGroupUserData = {
            type: UserDataTypeEnum.Enum.ColumnLayoutGroup,
            dnas,
            layout,
            sectionType,
            levelTypes,
            width,
            height,
            depth,
            vanillaColumn,
          };

          const columnLayoutGroup = new ColumnLayoutGroup(userData);

          columnLayoutGroup.add(...columnGroups);

          return columnLayoutGroup;
        })
      );
    })
  );
