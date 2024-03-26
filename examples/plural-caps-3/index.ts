import { createBasicScene } from "@/index";
import moduleGroupTaskOption from "@/tasks/moduleGroupTaskOption";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
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
  moduleGroupTaskOption({
    houseTypeIndex: 0,
    columnIndex: 3,
    levelIndex: 1,
    gridGroupIndex: 0,
  }),
  TO.map((moduleGroup) => {
    addObjectToScene(moduleGroup);

    let s = true;

    const CLIPPING_BRUSH_HEIGHT = 10;

    const clippingBrush = new Brush(
      new BoxGeometry(10, CLIPPING_BRUSH_HEIGHT, 10),
      new MeshBasicMaterial({ color: "white" })
    );
    clippingBrush.position.setY(CLIPPING_BRUSH_HEIGHT / 2 + 1.3);
    clippingBrush.visible = false;
    clippingBrush.updateMatrixWorld();

    addObjectToScene(clippingBrush);

    window.addEventListener("keydown", (event) => {
      // Spacebar or Enter key
      if (event.key === "x" || event.key === "X") {
        if (s) {
          moduleGroup.createLevelCutBrushes(clippingBrush);
          moduleGroup.showClippedBrushes();
        } else {
          moduleGroup.destroyClippedBrushes();
          moduleGroup.showElementBrushes();
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
