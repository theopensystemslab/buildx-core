import { HouseGroup } from "@/index";
import StretchManager from "@/three/managers/StretchManager";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import { ColumnGroup } from "@/three/objects/house/ColumnGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { O } from "@/utils/functions";
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

class VanillaPreparingManager implements StretchManager {
  houseGroup: HouseGroup;

  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    startColumnGroup: ColumnGroup;
    endColumnGroup: ColumnGroup;
    midColumnGroups: ColumnGroup[];
  };

  startData?: {
    side: 1 | -1;
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
        const {
          startColumnGroup,
          midColumnGroups,
          endColumnGroup,
          visibleColumnGroups,
        } = activeLayoutGroup.getPartitionedColumnGroups();

        visibleColumnGroups.forEach((column) => {
          console.log(`annotating column ${column.userData.columnIndex}`);
          this.annotateColumn(column, column.userData.columnIndex);
        });

        this.initData = {
          startColumnGroup,
          midColumnGroups,
          endColumnGroup,
        };

        this.handles.forEach((x) => {
          x.syncDimensions(activeLayoutGroup);
        });
        const [handleDown, handleUp] = this.handles;
        endColumnGroup.add(handleUp);
        startColumnGroup.add(handleDown);
      })
    );
  }

  gestureStart(side: 1 | -1) {
    this.startData = {
      side,
    };
  }

  gestureProgress(delta: number) {
    const { side } = this.startData!;

    const { startColumnGroup, endColumnGroup } = this.initData!;

    const bookendColumn = side === 1 ? endColumnGroup : startColumnGroup;

    bookendColumn.position.z += delta;
  }

  gestureEnd() {}

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  annotateColumn(column: ColumnGroup, index: number) {
    const sprite = new Sprite(
      new SpriteMaterial({
        map: this.createTextTexture(index.toString()),
        color: 0xff0000,
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

    const helper = new BoxHelper(column, 0x00ff00);
    this.houseGroup.scene.add(helper);

    const lineGeometry = new BufferGeometry().setFromPoints([
      new Vector3(0, -column.userData.height / 2, 0),
      new Vector3(0, column.userData.height * 1.5, 0),
    ]);
    const lineMaterial = new LineBasicMaterial({ color: 0xff00ff });
    const line = new Line(lineGeometry, lineMaterial);
    column.add(line);
  }

  updateColumnAnnotation(column: ColumnGroup, newIndex: number) {
    const sprite = column.getObjectByName("indexSprite") as Sprite | undefined;
    if (sprite && sprite.material instanceof SpriteMaterial) {
      sprite.material.map = this.createTextTexture(newIndex.toString());
      sprite.material.needsUpdate = true;
    } else {
      console.warn(
        "Sprite not found or invalid material. Creating new annotation."
      );
      this.annotateColumn(column, newIndex);
    }
  }
  createTextTexture(text: string): Texture {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 64;
    canvas.height = 64;
    context.font = "Bold 24px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.fillText(text, 32, 32);
    return new CanvasTexture(canvas);
  }
}

export default VanillaPreparingManager;
