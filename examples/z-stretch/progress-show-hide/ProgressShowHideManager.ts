// VanillaPreparingManager.ts
import { HouseGroup } from "@/index";
import StretchManager from "@/three/managers/StretchManager";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "@/three/objects/house/ColumnGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { A, O, TE } from "@/utils/functions";
import { floor } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import {
  BoxHelper,
  BufferGeometry,
  CanvasTexture,
  Line,
  LineBasicMaterial,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
} from "three";

const DEFAULT_MAX_DEPTH = 5;

class ProgressShowHideManager implements StretchManager {
  houseGroup: HouseGroup;

  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    startColumnGroup: ColumnGroup;
    endColumn: ColumnGroup;
    midColumns: ColumnGroup[];
    vanillaColumns: ColumnGroup[];
    maxDepth: number;
  };

  startData?: {
    side: 1 | -1;
    orderedColumns: ColumnGroup[];
    bookendColumn: ColumnGroup;
    lastVisibleIndex: number;
  };

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.handles = [
      new StretchHandleGroup({ axis: "z", side: -1, manager: this }),
      new StretchHandleGroup({ axis: "z", side: 1, manager: this }),
    ];
  }

  init() {
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
          TE.map((vanillaColumnGroups) => {
            if (vanillaColumnGroups.length > 0) {
              vanillaColumnGroups.forEach((x) => {
                hideObject(x);
              });
            }
            activeLayoutGroup.add(...vanillaColumnGroups);

            this.initData = {
              startColumnGroup,
              midColumns: midColumnGroups,
              endColumn: endColumnGroup,
              vanillaColumns: vanillaColumnGroups,
              maxDepth,
            };
          })
        )();
      })
    );
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) return;

    const {
      startColumnGroup,
      endColumn: endColumnGroup,
      vanillaColumns: vanillaColumnGroups,
      midColumns: midColumnGroups,
    } = this.initData;

    let orderedColumns: ColumnGroup[] = [],
      lastVisibleIndex: number = -1;

    // place the vanilla columns
    if (side === -1) {
      vanillaColumnGroups.forEach((columnGroup, index) => {
        const reversedIndex = vanillaColumnGroups.length - 1 - index;

        const startDepth = midColumnGroups[0].position.z;

        columnGroup.position.set(
          0,
          0,
          startDepth -
            reversedIndex * columnGroup.userData.depth -
            columnGroup.userData.depth
        );

        this.houseGroup.managers.cuts?.createObjectCuts(columnGroup);
        this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });

      orderedColumns = [
        startColumnGroup,
        ...vanillaColumnGroups,
        ...midColumnGroups,
        endColumnGroup,
      ];
      lastVisibleIndex = vanillaColumnGroups.length + 1;
    } else if (side === 1) {
      vanillaColumnGroups.forEach((columnGroup, index) => {
        const startDepth = endColumnGroup.position.z;

        columnGroup.position.set(
          0,
          0,
          startDepth + index * columnGroup.userData.depth
        );

        this.houseGroup.managers.cuts?.createObjectCuts(columnGroup);
        this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });

      orderedColumns = [
        startColumnGroup,
        ...midColumnGroups,
        ...vanillaColumnGroups,
        endColumnGroup,
      ];
      lastVisibleIndex = midColumnGroups.length;
    }

    // const target =
    //   orderedColumns[
    //     side === 1 ? lastVisibleIndex + 1 : lastVisibleIndex - 1
    //   ];

    // this.upsertColumnAnnotation(
    //   target,
    //   `lastVisible-${side}`,
    //   this.isVanillaColumn(target) ? 0xfff000 : 0xffffff
    // );

    this.startData = {
      side,
      orderedColumns,
      bookendColumn: side === 1 ? endColumnGroup : startColumnGroup,
      lastVisibleIndex,
    };

    if (side === -1) {
      const lastVisibleColumn = orderedColumns[lastVisibleIndex];
      // going in the negative direction remember!
      const firstInvisibleColumn = orderedColumns[lastVisibleIndex - 1];
      this.upsertColumnAnnotation(lastVisibleColumn, "lastVisible", 0xfff000);
      this.upsertColumnAnnotation(
        firstInvisibleColumn,
        "firstInvisible",
        0x000fff
      );
    }
  }

  gestureProgress(delta: number) {
    if (!this.startData) return;
    const { side, bookendColumn, orderedColumns, lastVisibleIndex } =
      this.startData!;

    bookendColumn.position.z += delta;
  }

  gestureEnd() {
    if (!this.startData) return;
    const { side, bookendColumn, orderedColumns, lastVisibleIndex } =
      this.startData;

    if (side === 1) {
      bookendColumn.position.z =
        orderedColumns[lastVisibleIndex].position.z +
        orderedColumns[lastVisibleIndex].userData.depth;
    } else if (side === -1) {
      bookendColumn.position.z =
        orderedColumns[lastVisibleIndex].position.z -
        bookendColumn.userData.depth;
    }
  }

  isVanillaColumn(column: ColumnGroup): boolean {
    return column.userData.columnIndex === -1;
  }
  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  upsertColumnAnnotation(column: ColumnGroup, label: string, color = 0xffffff) {
    showObject(column);
    const spriteHeight = column.userData.height + 1;
    const spriteZ = column.userData.depth / 2;

    // Update or create sprite
    let sprite = column.getObjectByName("indexSprite") as Sprite | undefined;
    if (!sprite) {
      sprite = new Sprite(new SpriteMaterial({ color }));
      sprite.name = "indexSprite";
      column.add(sprite);
    } else {
      if (sprite.material instanceof SpriteMaterial) {
        sprite.material.color.setHex(color);
      }
    }
    sprite.scale.setScalar(1);
    sprite.position.set(0, spriteHeight, spriteZ);
    if (sprite.material instanceof SpriteMaterial) {
      sprite.material.map = this.createTextTexture(label);
      sprite.material.needsUpdate = true;
    }
    showObject(sprite);

    // Update or create line
    let line = column.getObjectByName("indexLine") as Line | undefined;
    const lineGeometry = new BufferGeometry().setFromPoints([
      new Vector3(0, -column.userData.height / 2, 0),
      new Vector3(0, column.userData.height * 1.5, 0),
    ]);
    if (!line) {
      const lineMaterial = new LineBasicMaterial({ color });
      line = new Line(lineGeometry, lineMaterial);
      line.name = "indexLine";
      column.add(line);
    } else {
      line.geometry.dispose();
      line.geometry = lineGeometry;
    }
    showObject(line);

    // Update or create BoxHelper
    let helper = this.houseGroup.scene.getObjectByName(
      `boxHelper_${column.id}`
    ) as BoxHelper | undefined;

    if (!helper) {
      console.log("creating helper");
      helper = new BoxHelper(column, color); // Create an empty BoxHelper
      helper.name = `boxHelper_${column.id}`;
      this.houseGroup.scene.add(helper);
    } else {
      console.log("updating helper");
      helper.update();
    }

    return { sprite, helper, line };
  }

  createTextTexture(text: string): Texture {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 256;
    canvas.height = 128;
    context.font = "Bold 24px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.fillText(text, 128, 64);
    return new CanvasTexture(canvas);
  }
}

export default ProgressShowHideManager;
