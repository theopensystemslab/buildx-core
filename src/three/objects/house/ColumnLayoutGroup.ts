import { getSectionType } from "@/build-systems/cache";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { columnLayoutToLevelTypes } from "@/layouts/init";
import { Column, ColumnLayout } from "@/layouts/types";
import { createVanillaColumn } from "@/tasks/vanilla";
import { A, O, TE, someOrError } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { Box3, Group, Matrix3, Matrix4, Scene, Vector3 } from "three";
import { OBB } from "three-stdlib";
import { ColumnGroup, defaultColumnGroupCreator } from "./ColumnGroup";
import { HouseGroup } from "./HouseGroup";
import { ModuleGroup, ModuleGroupUserData } from "./ModuleGroup";
import { RowGroup } from "./RowGroup";

export const AABB_OFFSET = 10;

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

  constructor(userData: ColumnLayoutGroupUserData) {
    super();
    this.userData = userData;
    this.aabb = new Box3();
    this.obb = new OBB();
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

  getVisibleColumnGroups(sort: boolean = true): ColumnGroup[] {
    const visibleColumnGroups = this.children.filter(
      (x): x is ColumnGroup => x instanceof ColumnGroup && x.visible
    );

    return sort
      ? visibleColumnGroups.sort(
          (a, b) => a.userData.columnIndex - b.userData.columnIndex
        )
      : visibleColumnGroups;
  }

  updateDnas() {
    let result: string[][] = [];
    pipe(
      this.getVisibleColumnGroups(),
      A.map((v) => {
        v.traverse((node) => {
          if (node instanceof ModuleGroup && node.visible) {
            const {
              module: { dna },
            } = node.userData as ModuleGroupUserData;
            if (!(node.parent instanceof RowGroup))
              throw new Error("non-RowGroup parent of ModuleGroup");

            const rowIndex = node.parent.userData.rowIndex;

            if (!result[rowIndex]) {
              result[rowIndex] = [];
            }
            result[rowIndex].push(dna);
          }
        });
      })
    );
    this.userData.dnas = result.flat();
  }

  updateDepth() {
    const originalDepth = this.userData.depth;

    const nextDepth = this.getVisibleColumnGroups(false).reduce(
      (acc, v) => acc + v.userData.depth,
      0
    );

    this.userData.depth = nextDepth;

    this.position.setZ(-nextDepth / 2);

    this.houseGroup.position.add(
      new Vector3(0, 0, (nextDepth - originalDepth) / 2).applyAxisAngle(
        new Vector3(0, 1, 0),
        this.houseGroup.rotation.y
      )
    );

    this.updateBBs();
  }

  updateBBs() {
    const { width, height, depth } = this.userData;

    const { x, y, z } = this.houseGroup.position;

    const scaleFactor = 1.08;

    const center = new Vector3(x, y + height / 2, z);
    const halfSize = new Vector3(
      width / 2,
      height / 2,
      depth / 2
    ).multiplyScalar(scaleFactor);

    this.houseGroup.updateMatrix();

    const rotationMatrix4 = new Matrix4().extractRotation(
      this.houseGroup.matrix
    );

    this.obb.set(
      center,
      halfSize,
      new Matrix3().setFromMatrix4(rotationMatrix4)
    );

    // Initialize min and max vectors to extreme values
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);

    // AABB corners, DELTA to make it bigger so we can pre-empt
    // which houses to OBB-intersect-check
    [
      new Vector3(
        halfSize.x + AABB_OFFSET,
        halfSize.y + AABB_OFFSET,
        halfSize.z + AABB_OFFSET
      ),
      new Vector3(
        -(halfSize.x + AABB_OFFSET),
        halfSize.y + AABB_OFFSET,
        halfSize.z + AABB_OFFSET
      ),
      new Vector3(
        halfSize.x + AABB_OFFSET,
        -(halfSize.y + AABB_OFFSET),
        halfSize.z + AABB_OFFSET
      ),
      new Vector3(
        halfSize.x + AABB_OFFSET,
        halfSize.y + AABB_OFFSET,
        -(halfSize.z + AABB_OFFSET)
      ),
      new Vector3(
        -(halfSize.x + AABB_OFFSET),
        -(halfSize.y + AABB_OFFSET),
        halfSize.z + AABB_OFFSET
      ),
      new Vector3(
        -(halfSize.x + AABB_OFFSET),
        halfSize.y + AABB_OFFSET,
        -(halfSize.z + AABB_OFFSET)
      ),
      new Vector3(
        halfSize.x + AABB_OFFSET,
        -(halfSize.y + AABB_OFFSET),
        -(halfSize.z + AABB_OFFSET)
      ),
      new Vector3(
        -(halfSize.x + AABB_OFFSET),
        -(halfSize.y + AABB_OFFSET),
        -(halfSize.z + AABB_OFFSET)
      ),
    ].forEach((offset) => {
      offset.applyMatrix4(rotationMatrix4);
      offset.add(center);
      min.min(offset);
      max.max(offset);
    });

    // Set the AABB
    this.aabb.set(min, max);

    // if (DEBUG) {
    //   renderBBs();
    // }

    // invalidate();
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

          columnLayoutGroup.position.setZ(-depth / 2);

          columnLayoutGroup.updateOBB();

          return columnLayoutGroup;
        })
      );
    })
  );
