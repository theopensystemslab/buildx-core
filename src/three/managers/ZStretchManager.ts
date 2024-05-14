import { A, O, TE } from "@/utils/functions";
import { floor, sign } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "../objects/house/ColumnGroup";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";

export const DEFAULT_MAX_DEPTH = 10;

const lineMaterial = new LineBasicMaterial({ color: 0xff0000 }); // Red color for visibility

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

  constructor(columnLayoutGroup: ColumnLayoutGroup) {
    this.columnLayoutGroup = columnLayoutGroup;
    this.maxDepth = DEFAULT_MAX_DEPTH;
  }

  cleanup() {
    // remove all invisibles
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

        // const maxLen = pipe(
        //   systemId,
        //   getSystemSettings,
        //   O.match(
        //     () => DEFAULT_MAX_LENGTH,
        //     (x) => x.length.max
        //   )
        // );

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

  drawLineAt(z: number) {
    const scene = this.columnLayoutGroup.parent!;

    const points = [];
    points.push(new Vector3(-10, 0, z)); // Start point of the line
    points.push(new Vector3(10, 0, z)); // End point of the line

    const geometry = new BufferGeometry().setFromPoints(points);
    const line = new Line(geometry, lineMaterial);

    scene.add(line);
  }

  first(side: number) {
    if (!this.initData) return;

    const { startColumn, endColumn, vanillaColumnGroups } = this.initData;

    const midColumns: ColumnGroup[] = [];

    const allColumnGroups =
      side === 1
        ? [startColumn, ...midColumns, ...vanillaColumnGroups, endColumn]
        : [startColumn, ...vanillaColumnGroups, ...midColumns, endColumn];

    // const TESTING_CONSTANT = 0.05;

    switch (side) {
      case 1: {
        const startDepth = endColumn.position.z; // - endColumn.userData.depth;

        vanillaColumnGroups.forEach((columnGroup, index) => {
          columnGroup.position.set(
            0, // this.columnLayoutGroup.userData.width,
            0,
            startDepth + index * columnGroup.userData.depth
            // columnGroup.userData.depth / 2
          );
          // columnGroup.visible = true;
          // this.drawLineAt(columnGroup.position.z);
        });

        this.firstData = {
          allColumnGroups,
          startDepth,
        };

        this.progressData = {
          columnIndex: allColumnGroups.indexOf(
            midColumns[midColumns.length - 1]
          ), // allColumnGroups.length - 2,
          lastDepth: 0,
        };

        // endColumn.visible = false;

        // endColumn.position.z +=
        //   vanillaColumnGroups.length * vanillaColumnGroups[0].userData.depth;

        // endColumn.position.z += TESTING_CONSTANT;

        // this.drawLineAt(endColumn.position.z);
        // this.drawLineAt(endColumn.position.z + endColumn.userData.depth);

        // this.vanillaColumnsGroup.position.setZ(startDepth);

        // this.fences = this.vanillaColumnGroups.map(
        //   (x) => x.position.z + x.userData.depth / 2
        // );

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
            // startDepth -
            //   index * columnGroup.userData.depth -
            //   columnGroup.userData.depth / 2
          );

          // columnGroup.visible = true;
          // this.drawLineAt(columnGroup.position.z);
        });

        this.firstData = {
          allColumnGroups,
          startDepth,
        };

        this.progressData = {
          columnIndex: 1,
          lastDepth: 0,
        };

        // startColumn.position.z -= 5;

        // this.vanillaColumnsGroup.position.setZ(startDepth);

        // this.fences = this.vanillaColumnGroups.map(
        //   (x) =>
        //     startColumn.userData.depth / 2 + x.position.z - x.userData.depth / 2
        // );

        break;
      }
      default:
        throw new Error(
          "direction other than 1 or -1 in ZStretchManager.first"
        );
    }

    // startColumn.visible = false;
    // endColumn.visible = false;

    // this.columnLayoutGroup.children
    //   .filter((x) => x instanceof ColumnGroup)
    //   .forEach((child, index, children) => {
    //     if (index === 0 || index === children.length - 1) {
    //       child.visible = false;
    //     }
    //   });
  }

  progress(depth: number, side: number) {
    if (!this.initData || !this.firstData || !this.progressData) return;

    const {
      // startColumn
      initData: {
        endColumn,
        initialEndColumnZ,
        startColumn,
        initialStartColumnZ,
      },
      firstData: { allColumnGroups, startDepth },
      progressData: { columnIndex, lastDepth },
      // allColumnGroups
    } = this;

    const direction = sign(depth - lastDepth) * side;

    const [bookendColumn, initBookendZ] =
      side === 1
        ? [endColumn, initialEndColumnZ]
        : [startColumn, initialStartColumnZ];

    bookendColumn.position.setZ(initBookendZ + depth);

    // return;

    // endColumn.position.setZ(
    //   max(initialEndColumnZ, min(initialEndColumnZ + depth, this.maxDepth))
    // );

    if (side === 1 && direction === 1) {
      pipe(
        allColumnGroups,
        A.lookup(columnIndex + 1),
        O.map((nextTarget) => {
          // const startDepth =
          //   this.columnLayoutGroup.userData.depth - endColumn.userData.depth;
          if (depth >= nextTarget.position.z - startDepth) {
            this.progressData!.columnIndex++;
            nextTarget.visible = true;
          }
        })
      );
    }

    // if (side === 1 && direction === -1) {
    //   pipe(
    //     this.vanillaColumnGroups,
    //     A.lookup(this.vanillaColumnIndex),
    //     O.map((currentTarget) => {
    //       const startDepth =
    //         this.columnLayoutGroup.userData.depth - endColumn.userData.depth;

    //       if (depth <= currentTarget.position.z - startDepth) {
    //         this.vanillaColumnIndex--;
    //         currentTarget.visible = false;
    //       }
    //     })
    //   );
    // }

    this.progressData.lastDepth = depth;
  }

  // foo() {
  //   const {
  //     templateVanillaColumnGroup,
  //     columnLayoutGroup: layoutGroup,
  //     fences,
  //     // houseTransformsGroup,
  //     // lengthWiseNeighbours,
  //   } = this;

  //   const lastColumnGroup = fences[fences.length - 1].columnGroup;

  //   let z = 0;

  //   if (side === 1) {
  //     z = lastColumnGroup.position.z + lastColumnGroup.userData.depth;
  //   } else if (side === -1) {
  //     z =
  //       lastColumnGroup.position.z - templateVanillaColumnGroup.userData.depth;
  //   }

  //   const center = new Vector3(0, 0, 0);
  //   const halfSize = new Vector3(
  //     layoutGroup.userData.width / 2,
  //     layoutGroup.userData.height / 2,
  //     templateVanillaColumnGroup.userData.depth / 2
  //   );
  //   const obb = new OBB(center, halfSize);
  //   const mat = houseTransformsGroup.matrix
  //     .clone()
  //     .multiply(
  //       new Matrix4().makeTranslation(
  //         0,
  //         0,
  //         -(layoutGroup.userData.length / 2) + z
  //       )
  //     );
  //   obb.applyMatrix4(mat);

  //   if (DEBUG) {
  //     const scene = houseTransformsGroup.parent! as Scene;
  //     renderOBB(obb, scene);
  //   }

  //   for (let neighbour of lengthWiseNeighbours) {
  //     if (
  //       neighbour.userData
  //         .getActiveLayoutGroup()
  //         .userData.obb.intersectsOBB(obb)
  //     ) {
  //       return true;
  //     }
  //   }

  //   const columnGroup = templateVanillaColumnGroup.clone();
  //   columnGroup.position.setZ(z);

  //   setInvisibleNoRaycast(columnGroup);

  //   layoutGroup.add(columnGroup);

  //   fences.push({
  //     columnGroup,
  //     z: z + columnGroup.userData.depth / 2,
  //   });

  //   return false;
  // }
}

export default ZStretchManager;
