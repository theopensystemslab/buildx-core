// ZStretchManager.ts
import { HouseGroup } from "@/index";
import StretchManager from "@/three/managers/StretchManager";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "@/three/objects/house/ColumnGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { A, O, TE } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { Vector3 } from "three";

const DEFAULT_MAX_DEPTH = 15;

class ZStretchManager implements StretchManager {
  houseGroup: HouseGroup;

  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    startColumn: ColumnGroup;
    endColumn: ColumnGroup;
    midColumns: ColumnGroup[];
    vanillaColumns: ColumnGroup[];
    maxDepth: number;
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
                hideObject(x);
              });
              activeLayoutGroup.add(...vanillaColumns);
            }

            this.initData = {
              startColumn: startColumnGroup,
              midColumns: midColumnGroups,
              endColumn: endColumnGroup,
              vanillaColumns,
              maxDepth,
            };
          })
        )();
      })
    );
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) return;

    const { startColumn, endColumn, vanillaColumns, midColumns } =
      this.initData;

    let orderedColumns: ColumnGroup[] = [],
      lastVisibleIndex: number = -1;

    // place the vanilla columns
    if (side === -1) {
      vanillaColumns.forEach((columnGroup, index) => {
        const reversedIndex = vanillaColumns.length - 1 - index;

        const startDepth = midColumns[0].position.z;

        columnGroup.position.set(
          0,
          0,
          startDepth -
            reversedIndex * columnGroup.userData.depth -
            columnGroup.userData.depth
        );

        this.houseGroup.managers.cuts?.createObjectCuts(columnGroup);
        // this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });

      orderedColumns = [...vanillaColumns, ...midColumns];
      lastVisibleIndex = vanillaColumns.length;
    } else if (side === 1) {
      vanillaColumns.forEach((columnGroup, index) => {
        const startDepth = endColumn.position.z;

        columnGroup.position.set(
          0,
          0,
          startDepth + index * columnGroup.userData.depth
        );

        this.houseGroup.managers.cuts?.createObjectCuts(columnGroup);
        // this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });

      orderedColumns = [...midColumns, ...vanillaColumns];
      lastVisibleIndex = midColumns.length - 1;
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
      const lastVisibleColumn = orderedColumns[lastVisibleIndex];
      const firstInvisibleColumn = orderedColumns[lastVisibleIndex + 1]; // +1 because side 1

      if (delta > 0) {
        if (!firstInvisibleColumn) {
          return;
        }
        const targetZ = firstInvisibleColumn.position.z;
        const bookendZ = bookendColumn.position.z; // + bookendColumn.userData.depth;

        if (bookendZ > targetZ) {
          this.showVanillaColumn(firstInvisibleColumn);
          this.startData.lastVisibleIndex++;
        } else {
        }
      }

      if (delta < 0) {
        if (lastVisibleIndex === 1) return;
        if (!lastVisibleColumn) return;

        const targetZ = lastVisibleColumn.position.z;
        const bookendZ =
          bookendColumn.position.z + bookendColumn.userData.depth;

        if (bookendZ < targetZ) {
          // todo
          hideObject(lastVisibleColumn);
          this.startData.lastVisibleIndex--;
        }
      }
    }

    if (side === -1) {
      const lastVisibleColumn = orderedColumns[lastVisibleIndex];
      const firstInvisibleColumn = orderedColumns[lastVisibleIndex - 1]; // -1 because side -1

      if (delta < 0) {
        if (!firstInvisibleColumn) {
          return;
        }

        const targetZ = firstInvisibleColumn.position.z;
        const bookendZ =
          bookendColumn.position.z + bookendColumn.userData.depth;

        // clamp at the top
        if (lastVisibleIndex === 1 && targetZ - bookendZ < 0) {
          return;
        }

        if (bookendZ < targetZ) {
          // todo
          this.showVanillaColumn(firstInvisibleColumn);
          this.startData.lastVisibleIndex--;
        }
      }

      if (delta > 0) {
        const targetZ = lastVisibleColumn.position.z;
        const bookendZ =
          bookendColumn.position.z + bookendColumn.userData.depth;

        // clamp at the bottom
        if (
          lastVisibleIndex === orderedColumns.length - 2 &&
          targetZ - bookendZ < 0.01
        ) {
          return;
        }

        if (bookendZ > targetZ) {
          hideObject(lastVisibleColumn);
          this.startData.lastVisibleIndex++;
        }
      }
    }

    bookendColumn.position.z += delta;
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
      })
    );

    this.houseGroup.managers.xStretch?.init();

    // this.cleanup();

    this.init();
  }

  showVanillaColumn(column: ColumnGroup) {
    this.houseGroup.managers.cuts?.showAppropriateBrushes(column);
    showObject(column);
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
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }
}

export default ZStretchManager;
