// VanillaPreparingManager.ts
import { HouseGroup } from "@/index";
import { AbstractZStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import { createHandleMaterial } from "@/three/objects/handles/handleMaterial";
import StretchHandleMesh, {
  DEFAULT_HANDLE_SIZE,
} from "@/three/objects/handles/StretchHandleMesh";
import {
  ColumnGroup,
  defaultColumnGroupCreator,
} from "@/three/objects/house/ColumnGroup";
import {
  hideObject,
  showObject,
  showObjectCameraOnly,
} from "@/three/utils/layers";
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
  MeshStandardMaterial,
} from "three";

const DEFAULT_MAX_DEPTH = 5;

class ProgressShowHideManager extends AbstractZStretchManager {
  private handleMaterial: MeshStandardMaterial;
  handles?: [StretchHandleMesh, StretchHandleMesh];

  initData?: {
    startColumnGroup: ColumnGroup;
    endColumnGroup: ColumnGroup;
    midColumnGroups: ColumnGroup[];
    vanillaColumns: ColumnGroup[];
    maxDepth: number;
  };

  startData?: {
    side: 1 | -1;
    orderedColumns: ColumnGroup[];
    bookendColumn: ColumnGroup;
    lastVisibleIndex: number;
  };

  private targetLine: Line | null = null;
  private bookendLine: Line | null = null;

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);
    this.handleMaterial = createHandleMaterial();
  }

  clearHandles() {
    this.handles?.forEach((handle) => {
      handle.removeFromParent();
    });
    this.handles = undefined;
  }

  createHandles() {
    if (!this.initData) return;

    const { startColumnGroup, endColumnGroup } = this.initData;
    const { width } = this.houseGroup.unsafeActiveLayoutGroup.userData;

    const handle0 = new StretchHandleMesh({
      width,
      manager: this,
      material: this.handleMaterial,
      axis: "z",
      side: -1,
    });
    handle0.position.z = -DEFAULT_HANDLE_SIZE;
    startColumnGroup.add(handle0);

    const handle1 = new StretchHandleMesh({
      width,
      manager: this,
      material: this.handleMaterial,
      axis: "z",
      side: 1,
    });
    handle1.position.z = DEFAULT_HANDLE_SIZE + endColumnGroup.userData.depth;
    endColumnGroup.add(handle1);

    this.handles = [handle0, handle1];
  }

  init() {
    this.cleanup();

    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const { depth: layoutDepth, vanillaColumn } =
          activeLayoutGroup.userData;

        const { startColumnGroup, midColumnGroups, endColumnGroup } =
          activeLayoutGroup.getPartitionedColumnGroups();

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
          TE.map((vanillaColumns) => {
            if (vanillaColumns.length > 0) {
              vanillaColumns.forEach((x) => {
                hideObject(x);
              });
            }
            activeLayoutGroup.add(...vanillaColumns);

            this.initData = {
              startColumnGroup,
              midColumnGroups,
              endColumnGroup,
              vanillaColumns,
              maxDepth,
            };
            this.createHandles();
          })
        )();
      })
    );
  }

  gestureStart(side: 1 | -1) {
    if (!this.initData) return;

    const {
      startColumnGroup,
      endColumnGroup,
      vanillaColumns: vanillaColumnGroups,
      midColumnGroups,
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

        this.houseGroup.managers.cuts?.createClippedBrushes(columnGroup);
        // this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });

      orderedColumns = [...vanillaColumnGroups, ...midColumnGroups];
      lastVisibleIndex = vanillaColumnGroups.length;
    } else if (side === 1) {
      vanillaColumnGroups.forEach((columnGroup, index) => {
        const startDepth = endColumnGroup.position.z;

        columnGroup.position.set(
          0,
          0,
          startDepth + index * columnGroup.userData.depth
        );

        this.houseGroup.managers.cuts?.createClippedBrushes(columnGroup);
        // this.houseGroup.managers.cuts?.showAppropriateBrushes(columnGroup);
      });

      orderedColumns = [...midColumnGroups, ...vanillaColumnGroups];
      lastVisibleIndex = midColumnGroups.length - 1;
    }

    this.startData = {
      side,
      orderedColumns,
      bookendColumn: side === 1 ? endColumnGroup : startColumnGroup,
      lastVisibleIndex,
    };
  }

  gestureProgress(delta: number) {
    if (!this.startData || !this.initData) return;
    const { side, bookendColumn, orderedColumns, lastVisibleIndex } =
      this.startData!;

    if (side === 1) {
      const lastVisibleColumn = orderedColumns[lastVisibleIndex];
      const firstInvisibleColumn = orderedColumns[lastVisibleIndex + 1]; // +1 because side 1

      if (delta > 0) {
        if (!firstInvisibleColumn) {
          return;
        }
        const targetZ = firstInvisibleColumn.position.z;
        const bookendZ = bookendColumn.position.z; // + bookendColumn.userData.depth;

        if (bookendZ > targetZ) {
          this.showVanillaColumn(firstInvisibleColumn);
          this.startData.lastVisibleIndex++;
        } else {
        }

        this.drawLines(targetZ, bookendZ);
      }

      if (delta < 0) {
        if (lastVisibleIndex === 1) return;
        if (!lastVisibleColumn) return;

        const targetZ = lastVisibleColumn.position.z;
        const bookendZ =
          bookendColumn.position.z + bookendColumn.userData.depth;

        if (bookendZ < targetZ) {
          // todo
          hideObject(lastVisibleColumn);
          this.startData.lastVisibleIndex--;
        }

        this.drawLines(targetZ, bookendZ);
      }
    }

    if (side === -1) {
      const lastVisibleColumn = orderedColumns[lastVisibleIndex];
      const firstInvisibleColumn = orderedColumns[lastVisibleIndex - 1]; // -1 because side -1

      if (delta < 0) {
        if (!firstInvisibleColumn) {
          return;
        }

        const targetZ = firstInvisibleColumn.position.z;
        const bookendZ =
          bookendColumn.position.z + bookendColumn.userData.depth;

        // clamp at the top
        if (lastVisibleIndex === 1 && targetZ - bookendZ < 0) {
          return;
        }

        if (bookendZ < targetZ) {
          // todo
          this.showVanillaColumn(firstInvisibleColumn);
          this.startData.lastVisibleIndex--;
        }

        this.drawLines(targetZ, bookendZ);
      }

      if (delta > 0) {
        const targetZ = lastVisibleColumn.position.z;
        const bookendZ =
          bookendColumn.position.z + bookendColumn.userData.depth;

        // clamp at the bottom
        if (
          lastVisibleIndex === orderedColumns.length - 2 &&
          targetZ - bookendZ < 0.01
        ) {
          return;
        }

        if (bookendZ > targetZ) {
          hideObject(lastVisibleColumn);
          this.startData.lastVisibleIndex++;
        }

        this.drawLines(targetZ, bookendZ);
      }
    }

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

    this.reindexColumns();

    this.init();
  }

  showVanillaColumn(column: ColumnGroup) {
    this.houseGroup.managers.cuts?.showAppropriateBrushes(column);
    showObject(column);
  }

  reindexColumns() {
    if (!this.startData || !this.initData) return;
    const { endColumnGroup } = this.initData;
    const { orderedColumns } = this.startData;

    [...orderedColumns, endColumnGroup]
      .filter((x) => x.visible)
      .forEach((v, i) => {
        v.userData.columnIndex = i + 1;
      });
  }

  cleanup(): void {
    this.clearHandles();
    this.initData = undefined;
    this.startData = undefined;
  }

  isVanillaColumn(column: ColumnGroup): boolean {
    return column.userData.columnIndex === -1;
  }

  showHandles() {
    this.handles?.forEach(showObject);
  }

  hideHandles() {
    this.handles?.forEach(hideObject);
  }

  private drawLines(targetZ: number, bookendZ: number) {
    const lineHeight = 10; // Adjust as needed
    const lineColor = 0xff0000; // Red color

    // Draw target line
    if (!this.targetLine) {
      const geometry = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, targetZ),
        new Vector3(0, lineHeight, targetZ),
      ]);
      const material = new LineBasicMaterial({ color: lineColor });
      this.targetLine = new Line(geometry, material);
      showObjectCameraOnly(this.targetLine);
      pipe(
        this.houseGroup.activeLayoutGroup,
        O.map((activeLayoutGroup) => {
          activeLayoutGroup.add(this.targetLine!);
        })
      );
    } else {
      const positions = this.targetLine.geometry.attributes.position.array;
      positions[2] = targetZ;
      positions[5] = targetZ;
      this.targetLine.geometry.attributes.position.needsUpdate = true;
    }

    // Draw bookend line
    if (!this.bookendLine) {
      const geometry = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, bookendZ),
        new Vector3(0, lineHeight, bookendZ),
      ]);
      const material = new LineBasicMaterial({ color: lineColor });
      this.bookendLine = new Line(geometry, material);
      showObjectCameraOnly(this.bookendLine);
      pipe(
        this.houseGroup.activeLayoutGroup,
        O.map((activeLayoutGroup) => {
          activeLayoutGroup.add(this.bookendLine!);
        })
      );
    } else {
      const positions = this.bookendLine.geometry.attributes.position.array;
      positions[2] = bookendZ;
      positions[5] = bookendZ;
      this.bookendLine.geometry.attributes.position.needsUpdate = true;
    }
  }

  // @ts-ignore
  private upsertColumnAnnotation(
    column: ColumnGroup,
    label: string,
    color = 0xffffff
  ) {
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
    showObjectCameraOnly(sprite);

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
    showObjectCameraOnly(line);

    // Update or create BoxHelper
    let helper = this.houseGroup.scene?.getObjectByName(
      `boxHelper_${column.id}`
    ) as BoxHelper | undefined;

    if (!helper) {
      helper = new BoxHelper(column, color); // Create an empty BoxHelper
      helper.name = `boxHelper_${column.id}`;
      this.houseGroup.scene?.add(helper);
    } else {
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
