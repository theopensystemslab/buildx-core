// ZStretchManager.ts
import { HouseGroup } from "@/index";
import StretchManager from "@/three/managers/StretchManager";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "@/three/objects/house/ColumnGroup";
import { A, O, TE } from "@/utils/functions";
import { floor, max, min } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { Matrix3, Matrix4, Vector3 } from "three";
import { OBB } from "three-stdlib";
import OBBMesh from "../objects/OBBMesh";

const DEFAULT_MAX_DEPTH = 8;

const GRACE = 0.001;

class ZStretchManager implements StretchManager {
  houseGroup: HouseGroup;

  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    startColumn: ColumnGroup;
    endColumn: ColumnGroup;
    midColumns: ColumnGroup[];
    vanillaColumns: ColumnGroup[];
    maxDepth: number;
    lengthWiseNeighbours: HouseGroup[];
  };

  startData?: {
    side: 1 | -1;
    orderedColumns: ColumnGroup[];
    bookendColumn: ColumnGroup;
    lastVisibleIndex: number;
  };

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.handles = [
      new StretchHandleGroup({ axis: "z", side: -1, manager: this }),
      new StretchHandleGroup({ axis: "z", side: 1, manager: this }),
    ];
  }

  init() {
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const { depth: layoutDepth, vanillaColumn } =
          activeLayoutGroup.userData;

        const { startColumnGroup, midColumnGroups, endColumnGroup } =
          activeLayoutGroup.getPartitionedColumnGroups();

        this.handles.forEach((x) => {
          x.syncDimensions(activeLayoutGroup);
        });
        const [handleDown, handleUp] = this.handles;
        endColumnGroup.add(handleUp);
        startColumnGroup.add(handleDown);

        const maxDepth = DEFAULT_MAX_DEPTH;

        const maxMoreCols = floor(
          (maxDepth - layoutDepth) / vanillaColumn.columnDepth
        );

        const vanillaColumnGroupsTE = pipe(
          A.makeBy(maxMoreCols, () =>
            defaultColumnGroupCreator({
              positionedRows: vanillaColumn.positionedRows,
              columnIndex: -1,
            })
          ),
          A.sequence(TE.ApplicativePar)
        );

        pipe(
          vanillaColumnGroupsTE,
          TE.map((vanillaColumns) => {
            if (vanillaColumns.length > 0) {
              vanillaColumns.forEach((x) => {
                x.hide();
              });
              activeLayoutGroup.add(...vanillaColumns);
            }

            const lengthWiseNeighbours =
              this.houseGroup.managers.collisions?.computeLengthWiseNeighbours() ??
              [];

            this.initData = {
              startColumn: startColumnGroup,
              midColumns: midColumnGroups,
              endColumn: endColumnGroup,
              vanillaColumns,
              maxDepth,
              lengthWiseNeighbours,
            };
          })
        )();
      })
    );
  }

  // @ts-ignore
  private renderColumnOBB(column: ColumnGroup) {
    const scene = this.houseGroup.scene;

    const { width, height, depth } = column.userData;

    const halfSize = new Vector3(width / 2, height / 2, depth / 2);

    const rotation = new Matrix3().setFromMatrix4(
      new Matrix4().makeRotationY(this.houseGroup.rotation.y)
    );

    const columnOBB = new OBB(
      column.getWorldPosition(new Vector3()),
      halfSize,
      rotation
    );

    const columnOBBMesh = new OBBMesh(columnOBB);

    scene.add(columnOBBMesh);
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) return;

    const {
      startColumn,
      endColumn,
      vanillaColumns,
      midColumns,
      lengthWiseNeighbours,
    } = this.initData;

    let orderedColumns: ColumnGroup[] = [],
      lastVisibleIndex: number = -1;

    // place the vanilla columns if there are any
    if (vanillaColumns.length > 0) {
      const firstVanillaColumn = vanillaColumns[0];

      const halfSize = new Vector3(
        firstVanillaColumn.userData.width / 2,
        firstVanillaColumn.userData.height / 2,
        firstVanillaColumn.userData.depth / 2
      ).multiplyScalar(1.5);

      const rotation = new Matrix3().setFromMatrix4(
        new Matrix4().makeRotationY(this.houseGroup.rotation.y)
      );

      if (side === -1) {
        for (let i = 0; i < vanillaColumns.length; i++) {
          const column = vanillaColumns[i];
          const startDepth = midColumns[0].position.z;

          const depth =
            startDepth - i * column.userData.depth - column.userData.depth;

          column.position.set(0, 0, depth);

          const vanillaColumnOBB = new OBB(
            column
              .getWorldPosition(new Vector3())
              .add(new Vector3(0, 0, column.userData.depth)),
            halfSize,
            rotation
          );

          const collision = lengthWiseNeighbours.some((neighbour) => {
            const neighbourOBB = neighbour.unsafeOBB;
            return vanillaColumnOBB.intersectsOBB(neighbourOBB);
          });

          if (collision) {
            break;
          }

          this.houseGroup.managers.cuts?.createObjectCuts(column);
          orderedColumns.push(column);
        }

        orderedColumns.reverse();

        lastVisibleIndex = orderedColumns.length;
        orderedColumns.push(...midColumns);
      } else if (side === 1) {
        orderedColumns = [...midColumns];
        lastVisibleIndex = midColumns.length - 1;

        const startDepth = endColumn.position.z;

        for (let i = 0; i < vanillaColumns.length; i++) {
          const column = vanillaColumns[i];

          column.position.set(0, 0, startDepth + i * column.userData.depth);

          const vanillaColumnOBB = new OBB(
            column
              .getWorldPosition(new Vector3())
              .add(new Vector3(0, 0, column.userData.depth)),
            halfSize,
            rotation
          );

          const collision = lengthWiseNeighbours.some((neighbour) => {
            const neighbourOBB = neighbour.unsafeOBB;
            return vanillaColumnOBB.intersectsOBB(neighbourOBB);
          });

          if (collision) {
            break;
          }

          this.houseGroup.managers.cuts?.createObjectCuts(column);
          orderedColumns.push(column);
        }
      }
    } else {
      orderedColumns = [...midColumns];
    }

    this.startData = {
      side,
      orderedColumns,
      bookendColumn: side === 1 ? endColumn : startColumn,
      lastVisibleIndex,
    };
  }

  gestureProgress(delta: number) {
    if (!this.startData) return;

    const { side, bookendColumn, orderedColumns, lastVisibleIndex } =
      this.startData!;

    if (side === 1) {
      const firstInvisibleColumn = orderedColumns[lastVisibleIndex + 1]; // +1 because side 1

      if (delta > 0) {
        // bookend column movement logic
        const lastColumn = orderedColumns[orderedColumns.length - 1];
        const maxZ = lastColumn.position.z + lastColumn.userData.depth;
        bookendColumn.position.z = min(maxZ, bookendColumn.position.z + delta);

        // middle column show/hide logic
        if (firstInvisibleColumn) {
          const targetZ = firstInvisibleColumn.position.z;
          const bookendZ = bookendColumn.position.z; // + bookendColumn.userData.depth;

          if (bookendZ > targetZ) {
            this.showVanillaColumn(firstInvisibleColumn);
            this.startData.lastVisibleIndex++;
          }
        }
      }

      const lastVisibleColumn = orderedColumns[lastVisibleIndex];

      if (delta < 0) {
        // bookend column movement logic
        const minZ =
          orderedColumns[0].position.z + orderedColumns[0].userData.depth;
        bookendColumn.position.z = max(minZ, bookendColumn.position.z + delta);

        // middle column show/hide logic
        if (lastVisibleColumn) {
          const targetZ =
            lastVisibleColumn.position.z + lastVisibleColumn.userData.depth;
          const bookendZ =
            bookendColumn.position.z + bookendColumn.userData.depth;

          if (bookendZ <= targetZ) {
            lastVisibleColumn.hide();
            this.startData.lastVisibleIndex--;
          }
        }
      }
    }

    if (side === -1) {
      const firstInvisibleColumn = orderedColumns[lastVisibleIndex - 1]; // -1 because side -1

      if (delta < 0) {
        // bookend column movement logic
        const minZ =
          orderedColumns[0].position.z - bookendColumn.userData.depth;

        bookendColumn.position.z = max(minZ, bookendColumn.position.z + delta);

        // middle column show/hide logic
        if (firstInvisibleColumn) {
          const targetZ = firstInvisibleColumn.position.z;
          const bookendZ =
            bookendColumn.position.z + bookendColumn.userData.depth;

          if (bookendZ <= targetZ + GRACE) {
            this.showVanillaColumn(firstInvisibleColumn);
            this.startData.lastVisibleIndex--;
          }
        }
      }

      const lastVisibleColumn = orderedColumns[lastVisibleIndex];

      if (delta > 0) {
        // bookend column movement logic
        const lastColumn = orderedColumns[orderedColumns.length - 1];
        const maxZ = lastColumn.position.z - bookendColumn.userData.depth;
        bookendColumn.position.z = min(maxZ, bookendColumn.position.z + delta);

        // middle column show/hide logic
        if (lastVisibleColumn) {
          const targetZ = lastVisibleColumn.position.z;
          const bookendZ =
            bookendColumn.position.z + bookendColumn.userData.depth;

          if (bookendZ > targetZ) {
            lastVisibleColumn.hide();
            this.startData.lastVisibleIndex++;
          }
        }
      }
    }
  }

  gestureEnd() {
    if (!this.initData || !this.startData) return;
    const { endColumn } = this.initData;
    const { side, bookendColumn, orderedColumns, lastVisibleIndex } =
      this.startData;

    if (side === 1) {
      bookendColumn.position.z =
        orderedColumns[lastVisibleIndex].position.z +
        orderedColumns[lastVisibleIndex].userData.depth;

      // start column stays at 0 on this side
    } else if (side === -1) {
      bookendColumn.position.z =
        orderedColumns[lastVisibleIndex].position.z -
        bookendColumn.userData.depth;

      // bring the start column back to position 0 in the column layout
      const delta = -bookendColumn.position.z;
      bookendColumn.position.z = 0;

      // adjust other columns accordingly
      [...orderedColumns, endColumn].forEach((column) => {
        column.position.z += delta;
      });

      // adjust the houseGroup position accordingly
      this.houseGroup.position.sub(
        new Vector3(0, 0, delta).applyAxisAngle(
          new Vector3(0, 1, 0),
          this.houseGroup.rotation.y
        )
      );
    }

    this.reindexColumns();

    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((layoutGroup) => {
        layoutGroup.updateDepth();
        layoutGroup.updateLayout();

        this.houseGroup.updateDB();
      })
    );

    this.houseGroup.managers.xStretch?.init();

    // this.cleanup();

    this.init();
  }

  showVanillaColumn(column: ColumnGroup) {
    this.houseGroup.managers.cuts?.showAppropriateBrushes(column);
    column.show();
  }

  reindexColumns() {
    if (!this.startData || !this.initData) return;
    const { endColumn } = this.initData;
    const { orderedColumns } = this.startData;

    [...orderedColumns, endColumn]
      .filter((x) => x.visible)
      .forEach((v, i) => {
        v.userData.columnIndex = i + 1;
      });
  }

  cleanup() {
    if (!this.startData) return;
    const { orderedColumns } = this.startData;

    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((layoutGroup) => {
        const invisibleColumnGroups = orderedColumns.filter((x) => !x.visible);
        if (invisibleColumnGroups.length > 0)
          layoutGroup.remove(...invisibleColumnGroups);
      })
    );

    delete this.initData;
    delete this.startData;
  }

  showHandles() {
    this.handles.forEach((x) => x.show());
  }

  hideHandles() {
    this.handles.forEach((x) => x.hide());
  }
}

export default ZStretchManager;
