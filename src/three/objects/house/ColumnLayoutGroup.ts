import { getSectionType } from "@/build-systems/cache";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { columnLayoutToLevelTypes } from "@/layouts/init";
import { Column, ColumnLayout } from "@/layouts/types";
import { createVanillaColumn } from "@/tasks/vanilla";
import CutsManager from "@/three/managers/CutsManager";
import ZStretchManager from "@/three/managers/ZStretchManager";
import { A, O, TE, someOrError } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { Box3, Group, Scene } from "three";
import { OBB } from "three-stdlib";
import { defaultColumnGroupCreator } from "./ColumnGroup";
import { HouseGroup } from "./HouseGroup";

export type ColumnLayoutGroupUserData = {
  dnas: string[];
  layout: ColumnLayout;
  levelTypes: string[];
  width: number;
  height: number;
  depth: number;
  sectionType: SectionType;
  vanillaColumn: Column;
};

export class ColumnLayoutGroup extends Group {
  userData: ColumnLayoutGroupUserData;
  aabb: Box3;
  obb: OBB;
  cutsManager: CutsManager;
  zStretchManager: ZStretchManager;

  constructor(userData: ColumnLayoutGroupUserData) {
    super();
    this.userData = userData;
    this.aabb = new Box3();
    this.obb = new OBB();
    this.cutsManager = new CutsManager(this);
    this.zStretchManager = new ZStretchManager(this);
  }

  get houseGroup(): HouseGroup {
    if (this.parent instanceof HouseGroup) return this.parent;
    throw new Error(`get houseGroup failed`);
  }

  get scene(): Scene {
    return this.houseGroup.scene;
  }

  updateOBB() {
    const { width, height, depth } = this.userData;
    this.obb.halfSize.set(width / 2, height / 2, depth / 2);
  }

  get otherLayoutGroups(): ColumnLayoutGroup[] {
    const uuid = this.uuid;

    return this.houseGroup.children.filter(
      (x): x is ColumnLayoutGroup =>
        x instanceof ColumnLayoutGroup && x.uuid !== uuid
    );
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
    A.traverseWithIndex(TE.ApplicativePar)(
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
        sequenceT(TE.ApplicativePar)(
          createVanillaColumn({
            systemId,
            levelTypes,
            sectionType,
          }),
          getSectionType({ systemId, code: sectionType })
        ),
        TE.map(([vanillaColumn, sectionType]) => {
          const userData: ColumnLayoutGroupUserData = {
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

          columnLayoutGroup.updateOBB();

          return columnLayoutGroup;
        })
      );
    })
  );
