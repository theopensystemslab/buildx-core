// ZStretchManager.ts
import { HouseGroup } from "@/index";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "@/three/objects/house/ColumnGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { A, O, TE } from "@/utils/functions";
import { floor, max, min } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { Matrix3, Matrix4, Vector3 } from "three";
import { OBB } from "three-stdlib";
import OBBMesh from "../../objects/OBBMesh";
import { AbstractZStretchManager } from "./AbstractStretchManagers";

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

  startData?: {
    side: 1 | -1;
    orderedColumns: ColumnGroup[];
    bookendColumn: ColumnGroup;
    lastVisibleIndex: number;
  };

  // Add debug flag as class property
  private debug: boolean = false;

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);
    this.handles = [
      new StretchHandleGroup({ axis: "z", side: -1, manager: this }),
      new StretchHandleGroup({ axis: "z", side: 1, manager: this }),
    ];
  }

  init() {
    // Hide handles at the start of initialization
    this.hideHandles();

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

    this.startData = {
      side,
      orderedColumns,
      bookendColumn: side === 1 ? endColumn : startColumn,
      lastVisibleIndex: visibilityBoundaryIndex, // Store as lastVisibleIndex for compatibility
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
    if (!this.startData) return;

    const { side, bookendColumn, orderedColumns } = this.startData;

    if (side === 1) {
      // Rear side stretching
      if (delta > 0) {
        // Stretching outwards
        const maxZ =
          orderedColumns[orderedColumns.length - 1].position.z +
          orderedColumns[orderedColumns.length - 1].userData.depth;
        const newBookendZ = min(maxZ, bookendColumn.position.z + delta);
        bookendColumn.position.z = newBookendZ;
      } else {
        // Stretching inwards
        const minZ =
          orderedColumns[0].position.z + orderedColumns[0].userData.depth;
        const newBookendZ = max(minZ, bookendColumn.position.z + delta);
        bookendColumn.position.z = newBookendZ;
      }

      // Show/hide columns based on final position
      for (let i = 0; i <= orderedColumns.length - 1; i++) {
        const column = orderedColumns[i];
        const columnEndZ = column.position.z + column.userData.depth;

        if (columnEndZ <= bookendColumn.position.z + GRACE) {
          if (!column.visible) {
            this.showVanillaColumn(column);
            this.startData.lastVisibleIndex = i;
          }
        } else {
          if (column.visible) {
            hideObject(column);
            this.startData.lastVisibleIndex = i - 1;
          }
        }
      }
    }

    if (side === -1) {
      // Front side stretching
      if (delta < 0) {
        // Stretching outwards
        const minZ =
          orderedColumns[0].position.z - bookendColumn.userData.depth;
        const newBookendZ = max(minZ, bookendColumn.position.z + delta);
        bookendColumn.position.z = newBookendZ;
      } else {
        // Stretching inwards
        const maxZ =
          orderedColumns[orderedColumns.length - 1].position.z -
          bookendColumn.userData.depth;
        const newBookendZ = min(maxZ, bookendColumn.position.z + delta);
        bookendColumn.position.z = newBookendZ;
      }

      // Show/hide columns based on final position
      for (let i = orderedColumns.length - 1; i >= 0; i--) {
        const column = orderedColumns[i];
        const columnStartZ = column.position.z;

        if (
          columnStartZ >=
          bookendColumn.position.z + bookendColumn.userData.depth - GRACE
        ) {
          if (!column.visible) {
            this.showVanillaColumn(column);
            this.startData.lastVisibleIndex = i;
          }
        } else {
          if (column.visible) {
            hideObject(column);
            this.startData.lastVisibleIndex = i + 1;
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
    this.houseGroup.managers.xStretch?.showHandles();

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

  // Add method to toggle debug mode
  public toggleDebugMode(enabled?: boolean) {
    this.debug = enabled ?? !this.debug;
  }
}

export default ZStretchManager;
