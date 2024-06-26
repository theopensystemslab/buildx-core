import { A, Num, O, Ord, TE } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";
import StretchHandleGroup from "../objects/handles/StretchHandleGroup";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "../objects/house/ColumnGroup";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { hideObject, showObject } from "../utils/layers";
import { ModeEnum } from "./ModeManager";
import StretchManager from "./StretchManager";

const DEFAULT_MAX_DEPTH = 15;

const linePoints = [new Vector3(-10, 0, 0), new Vector3(10, 0, 0)];

const lineGeometry = new BufferGeometry().setFromPoints(linePoints);

const gestureLineMat = new LineBasicMaterial({ color: 0xff0000 }); // Red
const columnLineMat = new LineBasicMaterial({ color: 0x0000ff }); // Blue

class ZStretchManager implements StretchManager {
  layoutGroup: ColumnLayoutGroup;
  maxDepth: number;

  initData?: {
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
    lastVisibleMidColumnIndex: number;
  };

  debugGestureLine?: Line;
  debugColumnLine?: Line;
  debugColumnLines?: Line[];

  handles: [StretchHandleGroup, StretchHandleGroup];

  constructor(layoutGroup: ColumnLayoutGroup) {
    this.layoutGroup = layoutGroup;
    this.maxDepth = DEFAULT_MAX_DEPTH;
    this.handles = [
      new StretchHandleGroup({
        axis: "z",
        side: -1,
        manager: this,
      }),
      new StretchHandleGroup({
        axis: "z",
        side: 1,
        manager: this,
      }),
    ];
  }

  get houseGroup(): HouseGroup {
    return this.layoutGroup.houseGroup;
  }

  cleanup() {
    delete this.initData;
    delete this.startData;
    delete this.progressData;

    const invisibleColumnGroups = this.layoutGroup.children.filter(
      (x): x is ColumnGroup => x instanceof ColumnGroup && !x.visible
    );

    this.layoutGroup.remove(...invisibleColumnGroups);
  }

  async init() {
    this.cleanup();

    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const {
          userData: {
            vanillaColumn: { positionedRows, columnDepth },
            depth: layoutDepth,
          },
        } = this.layoutGroup;

        const maxDepth = this.maxDepth;

        const maxMoreCols = floor((maxDepth - layoutDepth) / columnDepth - 1);

        const vanillaColumnGroupsTE = pipe(
          A.makeBy(maxMoreCols, () =>
            defaultColumnGroupCreator({
              positionedRows,
              columnIndex: -1,
            })
          ),
          A.sequence(TE.ApplicativePar)
        );

        return pipe(
          vanillaColumnGroupsTE,
          TE.map((vanillaColumnGroups) => {
            const { children } = this.layoutGroup;

            const sortedVisibleColumnGroups = pipe(
              children,
              A.filter(
                (x): x is ColumnGroup => x instanceof ColumnGroup && x.visible
              ),
              A.sort(
                pipe(
                  Num.Ord,
                  Ord.contramap(
                    ({ userData: { columnIndex } }: ColumnGroup): number =>
                      columnIndex
                  )
                )
              )
            );

            const startColumnGroup = sortedVisibleColumnGroups[0];
            const endColumnGroup =
              sortedVisibleColumnGroups[sortedVisibleColumnGroups.length - 1];

            const midColumnGroups: ColumnGroup[] =
              this.layoutGroup.children.filter(
                (x): x is ColumnGroup =>
                  x instanceof ColumnGroup &&
                  x.visible &&
                  ![startColumnGroup, endColumnGroup].includes(x)
              );

            this.initData = {
              vanillaColumnGroups,
              startColumnGroup,
              endColumnGroup,
              midColumnGroups,
            };

            vanillaColumnGroups.forEach(hideObject);

            this.layoutGroup.add(...vanillaColumnGroups);

            this.handles.forEach((x) => {
              x.syncDimensions(this.layoutGroup);
              if (this.layoutGroup !== activeLayoutGroup) {
                this.hideHandles();
              }
            });

            const [handleDown, handleUp] = this.handles;
            endColumnGroup.add(handleUp);
            startColumnGroup.add(handleDown);

            if (
              this.layoutGroup.houseGroup.modeManager?.mode ===
              ModeEnum.Enum.SITE
            ) {
              this.hideHandles();
            }
          })
        )();
      })
    );
  }

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) throw new Error(`gestureStart called without initData`);

    this.houseGroup.xStretchManager?.hideHandles();

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

    const bookendColumn =
      side === 1
        ? allColumnGroups[allColumnGroups.length - 1]
        : allColumnGroups[0];

    const z0 = bookendColumn.position.z;

    // this.setGestureLine(z0);

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
        console.log(`syncing cuts ${columnGroup.uuid}`);
        this.layoutGroup.cutsManager?.syncObjectCuts(columnGroup);
      });

      const lastVisibleMidColumnIndex =
        this.initData.midColumnGroups.length - 1;

      this.progressData = {
        lastVisibleMidColumnIndex,
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
        this.layoutGroup.cutsManager?.syncObjectCuts(columnGroup);
      });

      this.progressData = {
        lastVisibleMidColumnIndex: 0,
      };
    }
  }

  gestureProgress(delta: number) {
    if (!this.startData)
      throw new Error(`gestureProgress called without startData`);
    if (!this.progressData)
      throw new Error(`gestureProgress called without progressData`);

    const { bookendColumn, side, midColumnGroups } = this.startData;

    const { lastVisibleMidColumnIndex } = this.progressData;

    const maybeNextPosition = bookendColumn.position.z + delta;

    if (side === 1) {
      const maxPosition =
        midColumnGroups[midColumnGroups.length - 1].position.z +
        midColumnGroups[midColumnGroups.length - 1].userData.depth;

      const minPosition =
        midColumnGroups[0].position.z + midColumnGroups[0].userData.depth;

      if (delta > 0) {
        if (maybeNextPosition > maxPosition) return;

        pipe(
          midColumnGroups,
          A.lookup(lastVisibleMidColumnIndex + 1),
          O.map((firstInvisibleColumn) => {
            const target =
              firstInvisibleColumn.position.z +
              firstInvisibleColumn.userData.depth / 2;

            // this.setColumnLine(target);

            if (bookendColumn.position.z > target) {
              showObject(firstInvisibleColumn);
              this.progressData!.lastVisibleMidColumnIndex++;
            }
          })
        );
      } else if (delta < 0) {
        if (lastVisibleMidColumnIndex === 0) return;

        if (maybeNextPosition <= minPosition) return;

        pipe(
          midColumnGroups,
          A.lookup(lastVisibleMidColumnIndex),
          O.map((finalVisibleColumn) => {
            const target =
              finalVisibleColumn.position.z +
              finalVisibleColumn.userData.depth / 2;

            // this.setColumnLine(target);

            if (bookendColumn.position.z < target) {
              hideObject(finalVisibleColumn);
              this.progressData!.lastVisibleMidColumnIndex--;
            }
          })
        );
      }
    }

    bookendColumn.position.z += delta;
    // this.setGestureLine(bookendColumn.position.z);
  }

  finalize() {
    if (!this.initData || !this.startData || !this.progressData) return;

    const { endColumnGroup } = this.initData;

    const { bookendColumn, midColumnGroups, side } = this.startData;
    const { lastVisibleMidColumnIndex } = this.progressData;

    if (side === 1) {
      bookendColumn.position.z =
        midColumnGroups[lastVisibleMidColumnIndex].position.z +
        midColumnGroups[lastVisibleMidColumnIndex].userData.depth;
    }

    const visibleMidColumnGroups = midColumnGroups.filter((x) => x.visible);

    visibleMidColumnGroups.forEach((v, i) => {
      v.userData.columnIndex = i + 1;
    });

    endColumnGroup.userData.columnIndex = visibleMidColumnGroups.length + 1;

    this.layoutGroup.updateDepth();
    this.layoutGroup.updateDnas();
  }

  gestureEnd() {
    this.finalize();
    this.init();
    this.houseGroup.xStretchManager?.init().then(() => {
      this.houseGroup.xStretchManager?.showHandles();
    });
  }

  setGestureLine(z: number) {
    if (this.debugGestureLine) {
      this.debugGestureLine.position.z = z;
    } else {
      this.debugGestureLine = new Line(lineGeometry, gestureLineMat);
      this.layoutGroup.add(this.debugGestureLine);
      this.debugGestureLine.position.z = z;
    }
  }

  moveGestureLine(delta: number) {
    if (this.debugGestureLine) this.debugGestureLine.position.z += delta;
  }

  setColumnLine(z: number) {
    if (this.progressData) {
      if (!this.debugColumnLine) {
        this.debugColumnLine = new Line(lineGeometry, gestureLineMat);
        this.layoutGroup.add(this.debugColumnLine);
      }
      if (this.startData?.midColumnGroups) {
        this.debugColumnLine.position.z = z;
      }
    }
  }

  setColumnLines() {
    if (!this.startData) return;

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

        this.layoutGroup.add(line);

        return line;
      });
    }
  }
}

export default ZStretchManager;
