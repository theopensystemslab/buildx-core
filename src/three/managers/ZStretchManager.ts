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
  // templateVanillaColumnGroup?: ColumnGroup;
  fences: FenceZ[];
  vanillaColumnsGroup: Group;
  vanillaColumnsGroupDepth: number;
  vanillaColumnGroups: ColumnGroup[];

  // ref state kinda stuff here

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

  init() {
    const {
      userData: {
        vanillaColumn: { positionedRows },
        depth: layoutDepth,
      },
    } = this.columnLayoutGroup;

    const templateVanillaColumnGroupCreator = defaultColumnGroupCreator({
      positionedRows,
      columnIndex: -1,
    });

    pipe(
      templateVanillaColumnGroupCreator,
      TE.map((templateVanillaColumnGroup) => {
        // this.templateVanillaColumnGroup = templateVanillaColumnGroup;

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
        this.vanillaColumnsGroup.position.setZ(
          this.columnLayoutGroup.userData.depth
        );

        // columnGroup.position.setZ(z)

        // setInvisibleNoRaycast(columnGroup);
        // layoutGroup.add(columnGroup);
      })
    )();

    // maybe just make them all up and down here?

    // what about side?

    // maybe we can maxMore and multiply to
    // create all the column groups
    // and even add them to the scene invisibly
    // and just move (position) them separately (e.g. on click)
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
