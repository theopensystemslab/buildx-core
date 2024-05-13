import { A, TE } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { Group } from "three";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "../objects/house/ColumnGroup";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";

const DEFAULT_MAX_DEPTH = 50;

type FenceZ = {
  z: number;
  columnGroup: ColumnGroup;
};

class ZStretchManager {
  columnLayoutGroup: ColumnLayoutGroup;
  fences: FenceZ[];
  vanillaColumnsGroup: Group;
  vanillaColumnsGroupDepth: number;
  vanillaColumnGroups: ColumnGroup[];
  asyncData?: {
    templateVanillaColumnGroup: ColumnGroup;
    startColumn: ColumnGroup;
    endColumn: ColumnGroup;
  };

  constructor(columnLayoutGroup: ColumnLayoutGroup) {
    this.columnLayoutGroup = columnLayoutGroup;

    this.fences = [];
    this.vanillaColumnGroups = [];
    this.vanillaColumnsGroup = new Group();
    this.vanillaColumnsGroupDepth = 0;
  }

  // measureAndProcess() {}
  // showUp() {}
  // showDown() {}
  // hideUp() {}
  // hideDown() {}
  // saveState() {}

  cleanup() {
    this.columnLayoutGroup.remove(this.vanillaColumnsGroup);
    this.vanillaColumnsGroup.clear();
    this.vanillaColumnsGroupDepth = 0;
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
        this.asyncData = {
          templateVanillaColumnGroup,
          startColumn,
          endColumn,
        };

        const { depth: vanillaColumnDepth } =
          templateVanillaColumnGroup.userData;

        const maxDepth = DEFAULT_MAX_DEPTH;

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
          A.makeBy(maxMoreCols, function (i) {
            const c = templateVanillaColumnGroup.clone();
            c.position.setZ(i * vanillaColumnDepth);
            return c;
          })
        );

        this.vanillaColumnsGroupDepth = maxMoreCols * vanillaColumnDepth;

        this.vanillaColumnGroups = vanillaColumnGroups;
        this.vanillaColumnsGroup.add(...vanillaColumnGroups);
        const { x: x0, y: y0, z: z0 } = this.columnLayoutGroup.position;
        this.vanillaColumnsGroup.position.set(
          x0 + this.columnLayoutGroup.userData.width,
          y0,
          z0
        );
        this.columnLayoutGroup.add(this.vanillaColumnsGroup);

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

    switch (direction) {
      case 1:
        this.vanillaColumnsGroup.position.setZ(
          this.columnLayoutGroup.userData.depth - endColumn.userData.depth
        );
        break;
      case -1:
        this.vanillaColumnsGroup.position.setZ(
          -this.vanillaColumnsGroupDepth + startColumn.userData.depth
        );
        break;
      default:
        throw new Error(
          "direction other than 1 or -1 in ZStretchManager.first"
        );
    }

    this.columnLayoutGroup.children
      .filter((x) => x instanceof ColumnGroup)
      .forEach((child, index, children) => {
        if (index === 0 || index === children.length - 1) {
          child.visible = false;
        }
      });
  }

  stretch(depth: number, direction: number) {
    console.log(depth, direction);
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
