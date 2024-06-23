import { A, O, TE, someOrError } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Line, LineBasicMaterial, Scene, Vector3 } from "three";
import StretchHandleGroup from "../objects/handles/StretchHandleGroup";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "../objects/house/ColumnGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { findFirstGuardUp } from "../utils/sceneQueries";
import { ModeEnum } from "./ModeManager";
import StretchManager from "./StretchManager";

const DEFAULT_MAX_DEPTH = 10;

const linePoints = [new Vector3(-10, 0, 0), new Vector3(10, 0, 0)];

const lineGeometry = new BufferGeometry().setFromPoints(linePoints);

const gestureLineMat = new LineBasicMaterial({ color: 0xff0000 }); // Red
const columnLineMat = new LineBasicMaterial({ color: 0x0000ff }); // Blue

class ZStretchManager implements StretchManager {
  houseGroup: HouseGroup;
  maxDepth: number;

  initData?: {
    templateVanillaColumnGroup: ColumnGroup;
    vanillaColumnGroups: ColumnGroup[];
    startColumnGroup: ColumnGroup;
    endColumnGroup: ColumnGroup;
    midColumnGroups: ColumnGroup[];
  };

  startData?: {
    side: 1 | -1;
    allColumnGroups: ColumnGroup[];
    bookendColumn: ColumnGroup;
    z0: number;
  };

  progressData?: {
    lastDepth: number;
    finalVisibleColumnIndex: number;
  };

  debugGestureLine?: Line;
  debugColumnLines?: Line[];

  handles: [StretchHandleGroup, StretchHandleGroup];

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.maxDepth = DEFAULT_MAX_DEPTH;
    this.handles = [
      new StretchHandleGroup({
        axis: "z",
        side: -1,
        houseGroup,
      }),
      new StretchHandleGroup({
        axis: "z",
        side: 1,
        houseGroup,
      }),
    ];
    this.init();
  }

  async init() {
    this.cleanup();

    const columnLayoutGroup = this.houseGroup.activeLayoutGroup;

    const {
      userData: {
        vanillaColumn: { positionedRows },
        depth: layoutDepth,
      },
    } = columnLayoutGroup;

    const templateVanillaColumnGroupCreator = defaultColumnGroupCreator({
      positionedRows,
      columnIndex: -1,
    });

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

        const { children } = columnLayoutGroup;

        const { startColumnGroup, endColumnGroup } = (function () {
          const columns = children.filter(
            (x): x is ColumnGroup => x instanceof ColumnGroup
          );

          const startColumnGroup = columns[0];
          const endColumnGroup = columns[columns.length - 1];

          return { startColumnGroup, endColumnGroup };
        })();

        const midColumnGroups: ColumnGroup[] =
          columnLayoutGroup.children.filter(
            (x): x is ColumnGroup => x instanceof ColumnGroup && x.visible
          );

        this.initData = {
          templateVanillaColumnGroup,
          vanillaColumnGroups,
          startColumnGroup,
          endColumnGroup,
          midColumnGroups,
        };

        columnLayoutGroup.add(...vanillaColumnGroups);

        const [handleDown, handleUp] = this.handles;
        endColumnGroup.add(handleUp);
        startColumnGroup.add(handleDown);

        if (this.houseGroup.modeManager.mode === ModeEnum.Enum.SITE) {
          this.hideHandles();
        }
      })
    )();
  }

  showHandles() {
    if (!this.initData) return;

    this.handles.forEach((handle) => {
      handle.visible = true;
    });
  }

  hideHandles() {
    this.handles.forEach((handle) => {
      handle.visible = false;
    });
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) throw new Error(`gestureStart called without initData`);

    const {
      startColumnGroup,
      endColumnGroup,
      midColumnGroups,
      vanillaColumnGroups,
    } = this.initData;

    const allColumnGroups =
      side === 1
        ? [
            startColumnGroup,
            ...midColumnGroups,
            ...vanillaColumnGroups,
            endColumnGroup,
          ]
        : [
            startColumnGroup,
            ...vanillaColumnGroups,
            ...midColumnGroups,
            endColumnGroup,
          ];

    const z0 =
      side === 1 ? endColumnGroup.position.z : startColumnGroup.position.z;

    this.setGestureLine(z0);

    this.startData = {
      allColumnGroups,
      bookendColumn:
        side === 1
          ? allColumnGroups[allColumnGroups.length - 1]
          : allColumnGroups[0],
      side,
      z0,
    };

    if (side === 1) {
      const startDepth = endColumnGroup.position.z;

      vanillaColumnGroups.forEach((columnGroup, index) => {
        columnGroup.position.set(
          0,
          0,
          startDepth + index * columnGroup.userData.depth
        );
      });

      const columnIndex = midColumnGroups.length;

      this.progressData = {
        finalVisibleColumnIndex: columnIndex,
        lastDepth: 0,
      };
    }

    if (side === -1) {
      const startDepth = startColumnGroup.userData.depth;

      vanillaColumnGroups.forEach((columnGroup, index) => {
        columnGroup.position.set(
          0,
          0,
          startDepth -
            index * columnGroup.userData.depth -
            columnGroup.userData.depth
        );
      });

      this.progressData = {
        finalVisibleColumnIndex: 1,
        lastDepth: 0,
      };
    }

    // vanillaColumnGroups.forEach((cg, i) => {
    //   cg.visible = true;
    // });
    // setTimeout(() => {
    //   vanillaColumnGroups.forEach((cg) => {
    //     cg.visible = false;
    //   });
    // }, 2000);

    this.setColumnLines();
  }

  gestureProgress(delta: number) {
    // if (!this.initData)
    //   throw new Error(`gestureProgress called without initData`);
    if (!this.startData)
      throw new Error(`gestureProgress called without startData`);
    if (!this.progressData)
      throw new Error(`gestureProgress called without progressData`);

    const {
      // z0,
      bookendColumn,
      side,
      allColumnGroups,
    } = this.startData;

    const { finalVisibleColumnIndex } = this.progressData;

    this.debugGestureLine?.position.add(new Vector3(0, 0, delta));
    bookendColumn.position.z += delta;

    // "position" is the beginning

    if (side === 1) {
      if (delta > 0) {
        // we're pushing away up the z-axis (additive)
        // checking collisions
        // checking maxing
        // checking if need to show an extra column
        // if our end column z goes over the dormant vanilla column

        pipe(
          allColumnGroups,
          A.lookup(finalVisibleColumnIndex + 1),
          O.map((firstInvisibleColumn) => {
            if (
              bookendColumn.position.z >
              firstInvisibleColumn.position.z +
                firstInvisibleColumn.userData.depth / 2
            ) {
              firstInvisibleColumn.visible = true;
              this.progressData!.finalVisibleColumnIndex++;
            }
          })
        );
      } else if (delta < 0) {
        if (finalVisibleColumnIndex === 1) return;

        pipe(
          allColumnGroups,
          A.lookup(finalVisibleColumnIndex),
          O.map((finalVisibleColumn) => {
            if (
              bookendColumn.position.z <
              finalVisibleColumn.position.z +
                finalVisibleColumn.userData.depth / 2
            ) {
              finalVisibleColumn.visible = false;
              this.progressData!.finalVisibleColumnIndex--;
            }
          })
        );
      }
    }
  }

  gestureEnd() {}

  cleanup() {
    const columnLayoutGroup = this.houseGroup.activeLayoutGroup;

    const invisibleColumnGroups = columnLayoutGroup.children.filter(
      (x) => x instanceof ColumnGroup && !x.visible
    );

    columnLayoutGroup.remove(...invisibleColumnGroups);
  }

  getScene() {
    return pipe(
      this.houseGroup.activeLayoutGroup,
      findFirstGuardUp((o): o is Scene => o instanceof Scene),
      someOrError(`scene not found above ZStretchManager's columnLayoutGroup`)
    );
  }

  setGestureLine(z: number) {
    const scene = this.getScene();

    if (this.debugGestureLine) {
      this.debugGestureLine.position.z = z;
    } else {
      this.debugGestureLine = new Line(lineGeometry, gestureLineMat);
      scene.add(this.debugGestureLine);
      this.debugGestureLine.position.z = z;
    }
  }

  setColumnLines() {
    if (!this.startData) return;

    const scene = this.getScene();

    const { allColumnGroups } = this.startData;

    if (this.debugColumnLines) {
      allColumnGroups.map((columnGroup, index) => {
        this.debugColumnLines![index].position.z = columnGroup.position.z;
      });
    } else {
      this.debugColumnLines = allColumnGroups.map(() => {
        const points = [new Vector3(-10, 0, 0), new Vector3(10, 0, 0)];
        const geometry = new BufferGeometry().setFromPoints(points);
        const line = new Line(geometry, columnLineMat);

        scene.add(line);

        return line;
      });
      this.setColumnLines();
    }
  }
}

export default ZStretchManager;
