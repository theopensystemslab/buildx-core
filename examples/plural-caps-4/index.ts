import { createBasicScene } from "@/index";
import rowGroupTaskOption from "@/tasks/rowGroupTaskOption";
import { ModuleGroup, isModuleGroup } from "@/three/objects/ModuleGroup";
import { TO } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { AxesHelper, BoxGeometry, MeshBasicMaterial } from "three";
import { Brush } from "three-bvh-csg";

const { addObjectToScene, render } = createBasicScene({
  outliner: (object) => {
    return object.parent && isModuleGroup(object.parent)
      ? object.parent.children
      : [];
  },
});

addObjectToScene(new AxesHelper());

pipe(
  rowGroupTaskOption({
    houseTypeIndex: 1,
    levelIndex: 1,
  }),
  TO.map((rowGroup) => {
    addObjectToScene(rowGroup);

    const rowLength = rowGroup.userData.length;
    const rowWidth = (rowGroup.children[0] as ModuleGroup).userData.width;

    let s = true;

    const CLIPPING_BRUSH_HEIGHT = 10;

    const clippingBrush = new Brush(
      new BoxGeometry(rowWidth * 1.2, CLIPPING_BRUSH_HEIGHT, rowLength * 1.2),
      new MeshBasicMaterial({ color: "white" })
    );
    clippingBrush.position.set(
      0,
      CLIPPING_BRUSH_HEIGHT / 2 + 1.3,
      rowLength / 2
    );
    clippingBrush.visible = false;
    clippingBrush.updateMatrixWorld();

    addObjectToScene(clippingBrush);

    window.addEventListener("keydown", (event) => {
      // Spacebar or Enter key
      if (event.key === "x" || event.key === "X") {
        if (s) {
          rowGroup.createLevelCutBrushes(clippingBrush);
          rowGroup.showClippedBrushes();
        } else {
          rowGroup.destroyClippedBrushes();
          rowGroup.showElementBrushes();
        }
        s = !s;
        render();
      }

      // d for debug switching
      if (event.key === "d" || event.key === "D") {
        clippingBrush.visible = !clippingBrush.visible;
        render();
      }
    });
  })
)();
