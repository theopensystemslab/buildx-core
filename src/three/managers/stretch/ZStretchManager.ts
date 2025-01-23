// ZStretchManager.ts
import { HouseGroup } from "@/index";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "@/three/objects/house/ColumnGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { A, O, TE } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { Matrix3, Matrix4, Vector3 } from "three";
import { OBB } from "three-stdlib";
import OBBMesh from "../../objects/OBBMesh";
import { AbstractZStretchManager } from "./AbstractStretchManagers";
import { createHandleMaterial } from "@/three/objects/handles/handleMaterial";

const DEFAULT_MAX_DEPTH = 8;

const GRACE = 0.001;

class ZStretchManager extends AbstractZStretchManager {
  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    startColumn: ColumnGroup;
    endColumn: ColumnGroup;
    midColumns: ColumnGroup[];
    vanillaColumns: ColumnGroup[];
    maxDepth: number;
    lengthWiseNeighbours: HouseGroup[];
  };

  scratchData?: {
    side: 1 | -1;
    orderedColumns: ColumnGroup[];
    bookendColumn: ColumnGroup;
    lastVisibleIndex: number;
    accZ: number;
  };

  // Add debug flag as class property
  private debug: boolean = false;

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);
    const handleMaterial = createHandleMaterial();
    this.handles = [
      new StretchHandleGroup({
        axis: "z",
        side: -1,
        manager: this,
        material: handleMaterial,
      }),
      new StretchHandleGroup({
        axis: "z",
        side: 1,
        manager: this,
        material: handleMaterial,
      }),
    ];
  }

  init() {
    // Hide handles at the start of initialization

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

            // Show handles only after everything is prepared
            this.showHandles();
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

    scene?.add(columnOBBMesh);
  }

  // Modify the debug visualization method to check debug flag
  private debugVisualizeOBB(obb: OBB, color: string = "red") {
    if (!this.debug) return;

    const scene = this.houseGroup.scene;
    if (!scene) return;

    const obbMesh = new OBBMesh(obb);
    // @ts-ignore
    obbMesh.material.color.set(color);
    // @ts-ignore
    obbMesh.material.opacity = 0.5;
    // @ts-ignore
    obbMesh.material.transparent = true;
    scene.add(obbMesh);

    // Optional: Remove after 5 seconds
    setTimeout(() => scene.remove(obbMesh), 5000);
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) return;

    const { xStretch } = this.houseGroup.managers;
    xStretch?.hideHandles();

    const {
      startColumn,
      endColumn,
      vanillaColumns,
      midColumns,
      lengthWiseNeighbours,
    } = this.initData;

    let orderedColumns: ColumnGroup[] = [];
    let visibilityBoundaryIndex: number;

    // Setup collision detection
    const firstVanillaColumn = vanillaColumns[0];
    const PADDING_MULTIPLIER = 1.75;
    const FIXED_PADDING = 0.1;

    const halfSize = new Vector3(
      firstVanillaColumn?.userData.width / 2,
      firstVanillaColumn?.userData.height / 2,
      firstVanillaColumn?.userData.depth / 2
    )
      .multiplyScalar(PADDING_MULTIPLIER)
      .addScalar(FIXED_PADDING);

    const rotation = new Matrix3().setFromMatrix4(
      new Matrix4().makeRotationY(this.houseGroup.rotation.y)
    );

    // Debug visualize lengthwise neighbors
    lengthWiseNeighbours.forEach((neighbour) => {
      this.debugVisualizeOBB(neighbour.unsafeOBB, "blue");
    });

    if (side === 1) {
      // Rear side: start with mid columns, then add vanilla columns
      orderedColumns = [...midColumns];
      visibilityBoundaryIndex = orderedColumns.length - 1; // Point to last visible column

      const startDepth = endColumn.position.z;

      // Add vanilla columns (they start hidden)
      for (let i = 0; i < vanillaColumns.length; i++) {
        const column = vanillaColumns[i];
        column.position.set(0, 0, startDepth + i * column.userData.depth);

        const vanillaColumnOBB = new OBB(
          column.getWorldPosition(new Vector3()),
          halfSize.clone(),
          rotation
        );

        // Debug visualize vanilla column OBB
        this.debugVisualizeOBB(vanillaColumnOBB, "green");

        const collision = lengthWiseNeighbours.some((neighbour) => {
          const neighbourOBB = neighbour.unsafeOBB;
          // Debug visualize actual collision test
          if (vanillaColumnOBB.intersectsOBB(neighbourOBB)) {
            this.debugVisualizeOBB(neighbourOBB, "red");
            return true;
          }
          return false;
        });

        if (collision) break;

        this.houseGroup.managers.cuts?.createClippedBrushes(column);
        hideObject(column); // Make sure vanilla columns start hidden
        orderedColumns.push(column);
      }
    } else {
      // Front side: start with vanilla columns (hidden), then add mid columns
      for (let i = 0; i < vanillaColumns.length; i++) {
        const column = vanillaColumns[i];
        const startDepth = midColumns[0].position.z;
        const depth =
          startDepth - i * column.userData.depth - column.userData.depth;

        column.position.set(0, 0, depth);

        const vanillaColumnOBB = new OBB(
          column.getWorldPosition(new Vector3()),
          halfSize.clone(),
          rotation
        );

        // Debug visualize vanilla column OBB
        this.debugVisualizeOBB(vanillaColumnOBB, "green");

        const collision = lengthWiseNeighbours.some((neighbour) => {
          const neighbourOBB = neighbour.unsafeOBB;
          // Debug visualize actual collision test
          if (vanillaColumnOBB.intersectsOBB(neighbourOBB)) {
            this.debugVisualizeOBB(neighbourOBB, "red");
            return true;
          }
          return false;
        });

        if (collision) break;

        this.houseGroup.managers.cuts?.createClippedBrushes(column);
        hideObject(column); // Make sure vanilla columns start hidden
        orderedColumns.push(column);
      }

      orderedColumns.reverse();
      visibilityBoundaryIndex = 0; // Point to first visible column
      orderedColumns.push(...midColumns);
    }

    this.scratchData = {
      side,
      orderedColumns,
      bookendColumn: side === 1 ? endColumn : startColumn,
      lastVisibleIndex: visibilityBoundaryIndex,
      accZ: side === 1 ? endColumn.position.z : startColumn.position.z,
    };
  }

  /**
   * Handles the progress of a Z-axis stretch gesture
   * @param delta The incremental change in Z position since the last progress event.
   *             This is NOT the total offset from gesture start, but rather the
   *             change since the last dragProgress event.
   *             The delta is already normalized to the Z-axis and accounts for the house's rotation.
   */
  gestureProgress(delta: number) {
    if (!this.scratchData) return;
    const { side, orderedColumns, bookendColumn } = this.scratchData;

    // Update target position directly with delta
    this.scratchData.accZ += delta;

    if (side === 1) {
      // Rear side
      // Ensure we can't go behind the first visible column
      const minZ =
        orderedColumns[0].position.z + orderedColumns[0].userData.depth;
      this.scratchData.accZ = Math.max(this.scratchData.accZ, minZ);

      // Update visibility based on which columns should be shown
      const previousVisible = this.scratchData.lastVisibleIndex;
      const newVisible = this.findLastVisibleColumnIndex();

      if (newVisible !== previousVisible) {
        this.updateColumnVisibility(previousVisible, newVisible);
        // Snap bookend to the last visible column
        const lastVisibleColumn = orderedColumns[newVisible];
        bookendColumn.position.z =
          lastVisibleColumn.position.z + lastVisibleColumn.userData.depth;
      }
    } else {
      // Front side
      // Ensure we can't go beyond the last column
      const maxZ = orderedColumns[orderedColumns.length - 1].position.z;
      this.scratchData.accZ = Math.min(this.scratchData.accZ, maxZ);

      const previousVisible = this.scratchData.lastVisibleIndex;
      const newVisible = this.findFirstVisibleColumnIndex();

      if (newVisible !== previousVisible) {
        this.updateColumnVisibility(previousVisible, newVisible);
        // Snap bookend to the first visible column
        const firstVisibleColumn = orderedColumns[newVisible];
        bookendColumn.position.z =
          firstVisibleColumn.position.z - bookendColumn.userData.depth;
      }
    }
  }

  gestureEnd() {
    if (!this.initData || !this.scratchData) return;
    const { endColumn } = this.initData;
    const { side, bookendColumn, orderedColumns, lastVisibleIndex } =
      this.scratchData;

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

        const { dnas } = layoutGroup.userData;

        this.houseGroup.hooks?.onHouseUpdate?.(
          this.houseGroup.userData.houseId,
          {
            dnas,
          }
        );
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
    if (!this.scratchData || !this.initData) return;
    const { endColumn } = this.initData;
    const { orderedColumns } = this.scratchData;

    [...orderedColumns, endColumn]
      .filter((x) => x.visible)
      .forEach((v, i) => {
        v.userData.columnIndex = i + 1;
      });
  }

  cleanup() {
    if (!this.scratchData) return;
    const { orderedColumns } = this.scratchData;

    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((layoutGroup) => {
        const invisibleColumnGroups = orderedColumns.filter((x) => !x.visible);
        if (invisibleColumnGroups.length > 0)
          layoutGroup.remove(...invisibleColumnGroups);
      })
    );

    delete this.initData;
    delete this.scratchData;
  }

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  // Add method to toggle debug mode
  public toggleDebugMode(enabled?: boolean) {
    this.debug = enabled ?? !this.debug;
  }

  private findLastVisibleColumnIndex(): number {
    const { orderedColumns, accZ: targetBookendZ } = this.scratchData!;

    for (let i = orderedColumns.length - 1; i >= 0; i--) {
      const column = orderedColumns[i];
      const columnEndZ = column.position.z + column.userData.depth;

      if (columnEndZ <= targetBookendZ + GRACE) {
        return i;
      }
    }
    return 0;
  }

  private findFirstVisibleColumnIndex(): number {
    const {
      orderedColumns,
      accZ: targetBookendZ,
      bookendColumn,
    } = this.scratchData!;

    for (let i = 0; i < orderedColumns.length; i++) {
      const column = orderedColumns[i];
      if (
        column.position.z >=
        targetBookendZ + bookendColumn.userData.depth - GRACE
      ) {
        return i;
      }
    }
    return orderedColumns.length - 1;
  }

  private updateColumnVisibility(previousVisible: number, newVisible: number) {
    if (newVisible === previousVisible) return;

    const { orderedColumns, side } = this.scratchData!;
    this.scratchData!.lastVisibleIndex = newVisible;

    if (side === 1) {
      // For rear side, show columns up to newVisible
      orderedColumns.forEach((column, i) => {
        if (i <= newVisible && !column.visible) {
          this.showVanillaColumn(column);
        } else if (i > newVisible && column.visible) {
          hideObject(column);
        }
      });
    } else {
      // For front side, show columns from newVisible onwards
      orderedColumns.forEach((column, i) => {
        if (i >= newVisible && !column.visible) {
          this.showVanillaColumn(column);
        } else if (i < newVisible && column.visible) {
          hideObject(column);
        }
      });
    }
  }
}

export default ZStretchManager;
