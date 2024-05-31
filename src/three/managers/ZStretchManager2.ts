import { A, TE, someOrError } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Line, LineBasicMaterial, Scene, Vector3 } from "three";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "../objects/house/ColumnGroup";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { findFirstGuardUp } from "../utils/sceneQueries";
import { DEFAULT_MAX_DEPTH } from "./ZStretchManager";
import StretchHandleGroup from "../objects/handles/StretchHandleGroup";

const linePoints = [new Vector3(-10, 0, 0), new Vector3(10, 0, 0)];

const lineGeometry = new BufferGeometry().setFromPoints(linePoints);

const gestureLineMat = new LineBasicMaterial({ color: 0xff0000 }); // Red
const columnLineMat = new LineBasicMaterial({ color: 0x0000ff }); // Blue

class ZStretchManager2 {
  columnLayoutGroup: ColumnLayoutGroup;
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
    columnIndex: number;
  };

  debugGestureLine?: Line;
  debugColumnLines?: Line[];

  handles: [StretchHandleGroup, StretchHandleGroup];

  constructor(columnLayoutGroup: ColumnLayoutGroup) {
    this.columnLayoutGroup = columnLayoutGroup;
    this.maxDepth = DEFAULT_MAX_DEPTH;
    this.handles = [
      new StretchHandleGroup({
        axis: "z",
        side: -1,
        houseGroup: columnLayoutGroup.houseGroup,
      }),
      new StretchHandleGroup({
        axis: "z",
        side: 1,
        houseGroup: columnLayoutGroup.houseGroup,
      }),
    ];
  }

  gestureEnd() {}

  gestureProgress(z: number) {
    if (!this.startData)
      throw new Error(`gestureProgress called without startData`);

    const { z0, bookendColumn } = this.startData;

    this.setGestureLine(z0 + z);
    bookendColumn.position.z = z0 + z;
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

    this.startData = {
      allColumnGroups,
      bookendColumn:
        side === 1
          ? allColumnGroups[allColumnGroups.length - 1]
          : allColumnGroups[0],
      side,
      z0,
    };

    this.setGestureLine(z0);

    switch (side) {
      case 1: {
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
          columnIndex,
          lastDepth: 0,
        };

        break;
      }
      case -1: {
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

    this.setColumnLines();
  }

  async init() {
    this.cleanup();

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

        const { children } = this.columnLayoutGroup;

        const { startColumnGroup, endColumnGroup } = (function () {
          const columns = children.filter(
            (x): x is ColumnGroup => x instanceof ColumnGroup
          );

          const startColumnGroup = columns[0];
          const endColumnGroup = columns[columns.length - 1];

          return { startColumnGroup, endColumnGroup };
        })();

        const midColumnGroups: ColumnGroup[] =
          this.columnLayoutGroup.children.filter(
            (x): x is ColumnGroup => x instanceof ColumnGroup && x.visible
          );

        this.initData = {
          templateVanillaColumnGroup,
          vanillaColumnGroups,
          startColumnGroup,
          endColumnGroup,
          midColumnGroups,
        };

        this.columnLayoutGroup.add(...vanillaColumnGroups);
      })
    )();
  }

  cleanup() {
    const invisibleColumnGroups = this.columnLayoutGroup.children.filter(
      (x) => x instanceof ColumnGroup && !x.visible
    );
    this.columnLayoutGroup.remove(...invisibleColumnGroups);
  }

  getScene() {
    return pipe(
      this.columnLayoutGroup,
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

export default ZStretchManager2;
