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
    midColumnGroups: ColumnGroup[]; // doesn't include vanilla
  };

  startData?: {
    side: 1 | -1;
    allColumnGroups: ColumnGroup[];
    midColumnGroups: ColumnGroup[]; // includes vanilla
    bookendColumn: ColumnGroup;
    z0: number;
  };

  progressData?: {
    lastVisibleMidColumnIndex: number; // of mid
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
            (x): x is ColumnGroup =>
              x instanceof ColumnGroup &&
              x.visible &&
              ![startColumnGroup, endColumnGroup].includes(x)
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

    const { startColumnGroup, endColumnGroup, vanillaColumnGroups } =
      this.initData;

    const midColumnGroups =
      side === 1
        ? [...this.initData.midColumnGroups, ...vanillaColumnGroups]
        : [...vanillaColumnGroups, ...this.initData.midColumnGroups];

    const allColumnGroups = [
      startColumnGroup,
      ...midColumnGroups,
      endColumnGroup,
    ];

    const z0 =
      side === 1 ? endColumnGroup.position.z : startColumnGroup.position.z;

    this.setGestureLine(z0);

    this.startData = {
      allColumnGroups,
      midColumnGroups,
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

      this.progressData = {
        lastVisibleMidColumnIndex: this.initData.midColumnGroups.length - 1,
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
        lastVisibleMidColumnIndex: 0,
      };
    }

    this.setColumnLines();
  }

  gestureProgress(delta: number) {
    if (!this.startData)
      throw new Error(`gestureProgress called without startData`);
    if (!this.progressData)
      throw new Error(`gestureProgress called without progressData`);

    const { bookendColumn, side, midColumnGroups } = this.startData;

    const { lastVisibleMidColumnIndex } = this.progressData;

    this.debugGestureLine?.position.add(new Vector3(0, 0, delta));
    bookendColumn.position.z += delta;

    if (side === 1) {
      if (delta > 0) {
        pipe(
          midColumnGroups,
          A.lookup(lastVisibleMidColumnIndex + 1),
          O.map((firstInvisibleColumn) => {
            if (
              bookendColumn.position.z >
              firstInvisibleColumn.position.z +
                firstInvisibleColumn.userData.depth / 2
            ) {
              firstInvisibleColumn.visible = true;
              this.progressData!.lastVisibleMidColumnIndex++;
            }
          })
        );
      } else if (delta < 0) {
        if (lastVisibleMidColumnIndex === 0) return;

        pipe(
          midColumnGroups,
          A.lookup(lastVisibleMidColumnIndex),
          O.map((finalVisibleColumn) => {
            if (
              bookendColumn.position.z <
              finalVisibleColumn.position.z +
                finalVisibleColumn.userData.depth / 2
            ) {
              console.log(
                this.progressData?.lastVisibleMidColumnIndex,
                finalVisibleColumn
              );
              finalVisibleColumn.visible = false;
              this.progressData!.lastVisibleMidColumnIndex--;
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
