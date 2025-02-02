import { BuildModule, getSectionType, SectionType } from "@/data/build-systems";
import {
  columnLayoutToDnas,
  columnLayoutToLevelTypes,
  createColumnLayout,
} from "@/layouts/init";
import { Column, ColumnLayout } from "@/layouts/types";
import { createVanillaColumn } from "@/tasks/vanilla";
import { A, O, someOrError, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import {
  Box3,
  BoxGeometry,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";
import { OBB } from "three-stdlib";
import BuildXScene from "../scene/BuildXScene";
import { ColumnGroup, defaultColumnGroupCreator } from "./ColumnGroup";
import { HouseGroup } from "./HouseGroup";
import { ModuleGroup, ModuleGroupUserData } from "./ModuleGroup";
import { RowGroup } from "./RowGroup";
import { AABB_OFFSET } from "@/constants";

const obbMaterial = new MeshBasicMaterial({
  color: "blue",
  wireframe: true,
  // transparent: true
});

const aabbMaterial = new MeshBasicMaterial({
  color: "red",
  wireframe: true,
  // transparent: true
});

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

  private debugOBBMesh: Mesh | null = null;
  private debugAABBMesh: Mesh | null = null;

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

  get scene(): BuildXScene | null {
    return this.houseGroup.scene;
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

  getPartitionedColumnGroups(): {
    startColumnGroup: ColumnGroup;
    endColumnGroup: ColumnGroup;
    midColumnGroups: ColumnGroup[];
    visibleColumnGroups: ColumnGroup[];
  } {
    const visibleColumnGroups = this.getVisibleColumnGroups();

    return {
      startColumnGroup: visibleColumnGroups[0],
      endColumnGroup: visibleColumnGroups[visibleColumnGroups.length - 1],
      midColumnGroups: visibleColumnGroups.slice(1, -1),
      visibleColumnGroups,
    };
  }

  updateLayout() {
    let modules: BuildModule[][][] = [];

    this.getVisibleColumnGroups().forEach((columnGroup, columnIndex) => {
      modules[columnIndex] = [];

      columnGroup.traverse((node) => {
        if (node instanceof ModuleGroup && node.visible) {
          const { module } = node.userData as ModuleGroupUserData;
          if (!(node.parent instanceof RowGroup)) {
            throw new Error("non-RowGroup parent of ModuleGroup");
          }

          const rowIndex = node.parent.userData.rowIndex;

          if (!modules[columnIndex][rowIndex]) {
            modules[columnIndex][rowIndex] = [];
          }

          modules[columnIndex][rowIndex].push(module);
        }
      });
    });

    this.userData.layout = createColumnLayout(modules);

    this.updateDnas();
  }

  private updateDnas() {
    this.userData.dnas = columnLayoutToDnas(this.userData.layout);

    this.houseGroup.updateElementBrushes();
  }

  updateDepth() {
    const originalDepth = this.userData.depth;
    const nextDepth = this.getVisibleColumnGroups(false).reduce(
      (acc, v) => acc + v.userData.depth,
      0
    );
    this.userData.depth = nextDepth;

    const depthDifference = nextDepth - originalDepth;
    this.position.setZ(-nextDepth / 2);

    this.houseGroup.position.add(
      new Vector3(0, 0, depthDifference / 2).applyAxisAngle(
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

    // AABB corners, AABB_OFFSET to make it bigger so we can pre-empt
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
  }

  renderOBB() {
    const scene = this.scene;

    const size = this.obb.halfSize.clone().multiplyScalar(2);

    if (this.debugOBBMesh) {
      scene?.remove(this.debugOBBMesh);
    }

    const geom = new BoxGeometry(size.x, size.y, size.z);
    const mesh = new Mesh(geom, obbMaterial);
    mesh.position.copy(this.obb.center);
    mesh.setRotationFromMatrix(new Matrix4().setFromMatrix3(this.obb.rotation));
    mesh.userData.type = "OBB";
    scene?.add(mesh);
    this.debugOBBMesh = mesh;
  }

  renderAABB() {
    return pipe(
      O.fromNullable(this.scene),
      O.map((scene) => {
        const size = new Vector3();
        this.aabb.getSize(size);

        const center = new Vector3();
        this.aabb.getCenter(center);

        if (this.debugAABBMesh) {
          scene.remove(this.debugAABBMesh);
        }

        const geom = new BoxGeometry(size.x, size.y, size.z);
        const mesh = new Mesh(geom, aabbMaterial);
        mesh.position.copy(center);
        mesh.userData.type = "AABB";
        scene.add(mesh);
        this.debugAABBMesh = mesh;
      })
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

          columnLayoutGroup.position.setZ(-depth / 2);

          return columnLayoutGroup;
        })
      );
    })
  );
