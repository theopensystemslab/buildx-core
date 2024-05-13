import { A, O, TE } from "@/utils/functions";
import { floor, max, min, sign } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "../objects/house/ColumnGroup";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";

export const DEFAULT_MAX_DEPTH = 10;

const DEBUG = false;

const lineMaterial = new LineBasicMaterial({ color: 0xff0000 }); // Red color for visibility

class ZStretchManager {
  columnLayoutGroup: ColumnLayoutGroup;
  vanillaColumnGroups: ColumnGroup[];
  vanillaColumnIndex: number;
  lastDepth: number;
  maxDepth: number;
  asyncData?: {
    templateVanillaColumnGroup: ColumnGroup;
    startColumn: ColumnGroup;
    endColumn: ColumnGroup;
    initialStartColumnZ: number;
    initialEndColumnZ: number;
  };

  constructor(columnLayoutGroup: ColumnLayoutGroup) {
    this.columnLayoutGroup = columnLayoutGroup;
    this.vanillaColumnGroups = [];
    this.vanillaColumnIndex = -1;
    this.lastDepth = 0;
    this.maxDepth = DEFAULT_MAX_DEPTH;
  }

  // measureAndProcess() {}
  // showUp() {}
  // showDown() {}
  // hideUp() {}
  // hideDown() {}
  // saveState() {}

  cleanup() {
    this.columnLayoutGroup.remove(...this.vanillaColumnGroups);
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

        this.asyncData = {
          templateVanillaColumnGroup,
          startColumn,
          endColumn,
          initialStartColumnZ: startColumn.position.z,
          initialEndColumnZ: endColumn.position.z,
        };

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

        this.vanillaColumnGroups = pipe(
          A.makeBy(maxMoreCols, () => templateVanillaColumnGroup.clone())
        );

        // this.vanillaColumnsGroup.add(...this.vanillaColumnGroups);
        // const { x: x0, y: y0, z: z0 } = this.columnLayoutGroup.position;
        // this.vanillaColumnsGroup.position.set(
        //   x0 + this.columnLayoutGroup.userData.width,
        //   y0,
        //   z0
        // );
        this.columnLayoutGroup.add(...this.vanillaColumnGroups);

        // this.vanillaColumnsGroup.position.setZ(-this.vanillaColumnsGroupDepth);
        // this.vanillaColumnsGroup.position.setZ(
        //   this.columnLayoutGroup.userData.depth
        // );

        // setInvisibleNoRaycast(columnGroup);
      })
    )();
  }

  first(direction: number) {
    if (!this.asyncData) return;

    const { startColumn, endColumn } = this.asyncData;

    const debug = () => {
      const scene = this.columnLayoutGroup.parent!;

      this.vanillaColumnGroups.forEach((columnGroup) => {
        const z = columnGroup.position.z;
        const points = [];
        points.push(new Vector3(-10, 0, z)); // Start point of the line
        points.push(new Vector3(10, 0, z)); // End point of the line

        const geometry = new BufferGeometry().setFromPoints(points);
        const line = new Line(geometry, lineMaterial);

        console.log(z);

        scene.add(line);
      });
    };

    switch (direction) {
      case 1: {
        const startDepth = endColumn.position.z - endColumn.userData.depth;
        // this.columnLayoutGroup.userData.depth - endColumn.userData.depth;

        this.vanillaColumnGroups.forEach((columnGroup, index) => {
          columnGroup.position.set(
            0, // this.columnLayoutGroup.userData.width,
            0,
            startDepth +
              (index * columnGroup.userData.depth +
                columnGroup.userData.depth / 2)
          );
        });

        // this.vanillaColumnsGroup.position.setZ(startDepth);

        // this.fences = this.vanillaColumnGroups.map(
        //   (x) => x.position.z + x.userData.depth / 2
        // );

        if (DEBUG) debug();

        break;
      }
      case -1: {
        const startDepth = startColumn.userData.depth;

        this.vanillaColumnGroups.forEach((columnGroup, index) => {
          columnGroup.position.set(
            this.columnLayoutGroup.userData.width,
            0,
            startDepth -
              index * columnGroup.userData.depth -
              columnGroup.userData.depth
            // startDepth -
            //   index * columnGroup.userData.depth -
            //   columnGroup.userData.depth / 2
          );
        });

        // this.vanillaColumnsGroup.position.setZ(startDepth);

        // this.fences = this.vanillaColumnGroups.map(
        //   (x) =>
        //     startColumn.userData.depth / 2 + x.position.z - x.userData.depth / 2
        // );

        if (DEBUG) debug();

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

  stretch(depth: number, side: number) {
    if (!this.asyncData) return;

    const {
      // startColumn
      endColumn,
      initialEndColumnZ,
    } = this.asyncData;

    const direction = sign(depth - this.lastDepth);

    endColumn.position.setZ(
      max(initialEndColumnZ, min(initialEndColumnZ + depth, this.maxDepth))
    );

    if (side === 1 && direction === 1) {
      pipe(
        this.vanillaColumnGroups,
        A.lookup(this.vanillaColumnIndex + 1),
        O.map((nextTarget) => {
          const startDepth =
            this.columnLayoutGroup.userData.depth - endColumn.userData.depth;
          if (depth > nextTarget.position.z - startDepth) {
            this.vanillaColumnIndex++;
            nextTarget.visible = true;
          }
        })
      );
    }

    if (side === 1 && direction === -1) {
      pipe(
        this.vanillaColumnGroups,
        A.lookup(this.vanillaColumnIndex),
        O.map((currentTarget) => {
          console.log({ currentTarget });
          const startDepth =
            this.columnLayoutGroup.userData.depth - endColumn.userData.depth;

          if (depth <= currentTarget.position.z - startDepth) {
            this.vanillaColumnIndex--;
            currentTarget.visible = false;
          }
        })
      );
    }

    this.lastDepth = depth;
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
