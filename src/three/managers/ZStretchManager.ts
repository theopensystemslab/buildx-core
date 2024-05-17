import { A, TE } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "../objects/house/ColumnGroup";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";

export const DEFAULT_MAX_DEPTH = 10;

const gestureLineMat = new LineBasicMaterial({ color: 0xff0000 }); // Red
const columnLineMat = new LineBasicMaterial({ color: 0x0000ff }); // Blue

class ZStretchManager {
  columnLayoutGroup: ColumnLayoutGroup;
  maxDepth: number;
  initData?: {
    templateVanillaColumnGroup: ColumnGroup;
    startColumn: ColumnGroup;
    endColumn: ColumnGroup;
    vanillaColumnGroups: ColumnGroup[];
    initialStartColumnZ: number;
    initialEndColumnZ: number;
  };
  firstData?: {
    allColumnGroups: ColumnGroup[];
    startDepth: number;
  };
  progressData?: {
    lastDepth: number;
    columnIndex: number;
  };

  debugGestureLine?: Line;
  debugColumnLines?: Line[];
  // debug?: {
  //   gestureLine: Line;
  //   columnLines: Line[];
  // };

  constructor(columnLayoutGroup: ColumnLayoutGroup) {
    this.columnLayoutGroup = columnLayoutGroup;
    this.maxDepth = DEFAULT_MAX_DEPTH;
  }

  cleanup() {
    const invisibleColumnGroups = this.columnLayoutGroup.children.filter(
      (x) => x instanceof ColumnGroup && !x.visible
    );
    this.columnLayoutGroup.remove(...invisibleColumnGroups);
  }

  async init() {
    this.cleanup();

    const {
      userData: {
        vanillaColumn: { positionedRows },
        depth: layoutDepth,
      },
      children,
    } = this.columnLayoutGroup;

    const templateVanillaColumnGroupCreator = defaultColumnGroupCreator({
      positionedRows,
      columnIndex: -1,
    });

    const { startColumn, endColumn } = (function () {
      const columns = children.filter(
        (x): x is ColumnGroup => x instanceof ColumnGroup
      );

      const startColumn = columns[0];
      const endColumn = columns[columns.length - 1];

      return { startColumn, endColumn };
    })();

    return pipe(
      templateVanillaColumnGroupCreator,
      TE.map((templateVanillaColumnGroup) => {
        templateVanillaColumnGroup.visible = false;

        const { depth: vanillaColumnDepth } =
          templateVanillaColumnGroup.userData;

        const maxDepth = this.maxDepth;

        const maxMoreCols = floor(
          (maxDepth - layoutDepth) / vanillaColumnDepth - 1
        );

        const vanillaColumnGroups = pipe(
          A.makeBy(maxMoreCols, () => templateVanillaColumnGroup.clone())
        );

        this.initData = {
          templateVanillaColumnGroup,
          startColumn,
          endColumn,
          initialStartColumnZ: startColumn.position.z,
          initialEndColumnZ: endColumn.position.z,
          vanillaColumnGroups,
        };

        this.columnLayoutGroup.add(...vanillaColumnGroups);
      })
    )();
  }

  initGestureLine(side: 1 | -1) {
    if (!this.initData) return;

    const { initialEndColumnZ } = this.initData;
    const z = side === 1 ? initialEndColumnZ : 0;
    const scene = this.columnLayoutGroup.parent!;
    const gestureLinePoints = [
      new Vector3(-10, 0.1, z),
      new Vector3(10, 0.1, z),
    ];
    const gestureLineGeometry = new BufferGeometry().setFromPoints(
      gestureLinePoints
    );
    const gestureLine = new Line(gestureLineGeometry, gestureLineMat);
    this.debugGestureLine = gestureLine;
    scene.add(gestureLine);
  }

  initColumnLines(allColumnGroups: ColumnGroup[]) {
    const scene = this.columnLayoutGroup.parent!;

    this.debugColumnLines = allColumnGroups.map((columnGroup) => {
      const points = [
        new Vector3(-10, 0, columnGroup.position.z),
        new Vector3(10, 0, columnGroup.position.z),
      ];
      const geometry = new BufferGeometry().setFromPoints(points);
      const line = new Line(geometry, columnLineMat);

      scene.add(line);

      return line;
    });
  }

  updateColumnLines(allColumnGroups: ColumnGroup[]) {
    if (!this.debugColumnLines) return;

    allColumnGroups.forEach((columnGroup, index) => {
      const line = this.debugColumnLines![index];
      const points = line.geometry.attributes.position.array as Float32Array;
      points[2] = points[5] = columnGroup.position.z;
      line.geometry.attributes.position.needsUpdate = true;
    });
  }

  updateGestureLine(z: number) {
    if (!this.debugGestureLine) return;

    const points = this.debugGestureLine.geometry.attributes.position
      .array as Float32Array;
    points[2] = points[5] = z;
    this.debugGestureLine.geometry.attributes.position.needsUpdate = true;
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) return;

    const { startColumn, endColumn, vanillaColumnGroups } = this.initData;

    const midColumnGroups: ColumnGroup[] =
      this.columnLayoutGroup.children.filter(
        (x): x is ColumnGroup => x instanceof ColumnGroup && x.visible
      );

    const allColumnGroups =
      side === 1
        ? [startColumn, ...midColumnGroups, ...vanillaColumnGroups, endColumn]
        : [startColumn, ...vanillaColumnGroups, ...midColumnGroups, endColumn];

    this.initGestureLine(side);

    switch (side) {
      case 1: {
        const startDepth = endColumn.position.z;

        vanillaColumnGroups.forEach((columnGroup, index) => {
          columnGroup.position.set(
            0,
            0,
            startDepth + index * columnGroup.userData.depth
          );
        });

        this.firstData = {
          allColumnGroups,
          startDepth,
        };

        const columnIndex = midColumnGroups.length;

        this.progressData = {
          columnIndex,
          lastDepth: 0,
        };

        break;
      }
      case -1: {
        const startDepth = startColumn.userData.depth;

        vanillaColumnGroups.forEach((columnGroup, index) => {
          columnGroup.position.set(
            0,
            0,
            startDepth -
              index * columnGroup.userData.depth -
              columnGroup.userData.depth
          );
        });

        this.firstData = {
          allColumnGroups,
          startDepth,
        };

        this.progressData = {
          columnIndex: 1,
          lastDepth: 0,
        };

        break;
      }
      default:
        throw new Error(
          "direction other than 1 or -1 in ZStretchManager.first"
        );
    }

    this.initColumnLines(allColumnGroups);
  }

  gestureProgress(depth: number, side: number) {
    if (!this.initData || !this.firstData || !this.progressData) return;

    const {
      initData: {
        endColumn,
        initialEndColumnZ,
        startColumn,
        // initialStartColumnZ,
      },
      firstData: {
        allColumnGroups,
        // startDepth
      },
      // progressData: { columnIndex, lastDepth },
    } = this;

    const normalizedDepth = side === 1 ? initialEndColumnZ + depth : depth;

    this.updateGestureLine(normalizedDepth);
    this.updateColumnLines(allColumnGroups);

    // const direction = sign(normalizedDepth - lastDepth);

    const bookendColumn = side === 1 ? endColumn : startColumn;

    bookendColumn.position.setZ(normalizedDepth);

    // if (side === 1) {
    //   if (direction === 1) {
    //     pipe(
    //       allColumnGroups,
    //       A.lookup(columnIndex + 1),
    //       O.map((nextTarget) => {
    //         if (
    //           depth >=
    //           nextTarget.position.z + nextTarget.userData.depth / 2 - startDepth
    //         ) {
    //           this.progressData!.columnIndex++;
    //           nextTarget.visible = true;
    //         }
    //       })
    //     );
    //   } else if (direction === -1 && columnIndex > 1) {
    //     pipe(
    //       allColumnGroups,
    //       A.lookup(columnIndex),
    //       O.map((currentTarget) => {
    //         if (
    //           depth <=
    //           currentTarget.position.z +
    //             currentTarget.userData.depth / 2 -
    //             startDepth
    //         ) {
    //           this.progressData!.columnIndex--;
    //           currentTarget.visible = false;
    //         }
    //       })
    //     );
    //   }
    // }

    this.progressData.lastDepth = normalizedDepth;
  }

  gestureEnd() {}
}

export default ZStretchManager;
