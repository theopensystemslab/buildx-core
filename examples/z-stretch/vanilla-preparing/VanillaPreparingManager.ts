// VanillaPreparingManager.ts
import { HouseGroup } from "@/index";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import { AbstractZStretchManager } from "@/three/managers/AbstractStretchManagers";
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

class VanillaPreparingManager extends AbstractZStretchManager {
  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    startColumnGroup: ColumnGroup;
    endColumnGroup: ColumnGroup;
    midColumnGroups: ColumnGroup[];
    vanillaColumnGroups: ColumnGroup[];
    maxDepth: number;
  };

  startData?: {
    side: 1 | -1;
  };

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);
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

        const {
          startColumnGroup,
          midColumnGroups,
          endColumnGroup,
          visibleColumnGroups,
        } = activeLayoutGroup.getPartitionedColumnGroups();

        visibleColumnGroups.forEach((column, i) => {
          this.annotateColumn(
            column,
            `c:${column.userData.columnIndex} i:${i}`
          );
        });

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
              activeLayoutGroup.add(...vanillaColumnGroups);
            }

            vanillaColumnGroups.forEach((column, i) => {
              this.annotateColumn(
                column,
                `c:${column.userData.columnIndex} i:${i}`,
                0xfff000
              );
            });

            this.initData = {
              startColumnGroup,
              midColumnGroups,
              endColumnGroup,
              vanillaColumnGroups,
              maxDepth,
            };
          })
        )();
      })
    );
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) return;

    const { endColumnGroup, vanillaColumnGroups, midColumnGroups } =
      this.initData;

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

        this.updateColumnAnnotations(columnGroup);

        this.houseGroup.managers.cuts?.createClippedBrushes(columnGroup);
        this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });
    } else if (side === 1) {
      vanillaColumnGroups.forEach((columnGroup, index) => {
        const startDepth = endColumnGroup.position.z;

        columnGroup.position.set(
          0,
          0,
          startDepth + index * columnGroup.userData.depth
        );

        this.updateColumnAnnotations(columnGroup);

        this.houseGroup.managers.cuts?.createClippedBrushes(columnGroup);
        this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });
    }

    this.startData = {
      side,
    };
  }

  gestureProgress(delta: number) {
    const { side } = this.startData!;

    const { startColumnGroup, endColumnGroup } = this.initData!;

    const bookendColumn = side === 1 ? endColumnGroup : startColumnGroup;

    bookendColumn.position.z += delta;

    this.updateColumnAnnotations(bookendColumn);
  }

  gestureEnd() {}

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  annotateColumn(column: ColumnGroup, label: string, color = 0xffffff) {
    const sprite = new Sprite(
      new SpriteMaterial({
        map: this.createTextTexture(label),
        color,
      })
    );
    sprite.scale.setScalar(0.5);
    sprite.name = "indexSprite";

    sprite.position.set(
      0,
      column.userData.height + 1,
      column.userData.depth / 2
    );
    column.add(sprite);

    const helper = new BoxHelper(column, color);
    helper.name = `boxHelper_${column.id}`;
    this.houseGroup.scene?.add(helper);

    const lineGeometry = new BufferGeometry().setFromPoints([
      new Vector3(0, -column.userData.height / 2, 0),
      new Vector3(0, column.userData.height * 1.5, 0),
    ]);
    const lineMaterial = new LineBasicMaterial({ color });
    const line = new Line(lineGeometry, lineMaterial);
    line.name = "indexLine";
    column.add(line);
  }

  updateColumnAnnotations(column: ColumnGroup, newText?: string) {
    // Update sprite position and text
    const sprite = column.getObjectByName("indexSprite") as Sprite | undefined;
    if (sprite) {
      sprite.position.set(
        0,
        column.userData.height + 1,
        column.userData.depth / 2
      );
      if (newText && sprite.material instanceof SpriteMaterial) {
        sprite.material.map = this.createTextTexture(newText);
        sprite.material.needsUpdate = true;
      }
    }

    // Update line position
    const line = column.getObjectByName("indexLine") as Line | undefined;
    if (line) {
      const lineGeometry = new BufferGeometry().setFromPoints([
        new Vector3(0, -column.userData.height / 2, 0),
        new Vector3(0, column.userData.height * 1.5, 0),
      ]);
      line.geometry.dispose();
      line.geometry = lineGeometry;
    }

    // Update BoxHelper
    const helper = this.houseGroup.scene?.getObjectByName(
      `boxHelper_${column.id}`
    ) as BoxHelper | undefined;
    if (helper) {
      helper.update();
    }
  }

  createTextTexture(text: string): Texture {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 128;
    canvas.height = 64;
    context.font = "Bold 24px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.fillText(text, 64, 32);
    return new CanvasTexture(canvas);
  }

  cleanup(): void {}
}

export default VanillaPreparingManager;
