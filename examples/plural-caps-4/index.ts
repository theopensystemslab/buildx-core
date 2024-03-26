import { createBasicScene } from "@/index";
import rowGroupTaskOption from "@/tasks/rowGroupTaskOption";
import { ModuleGroup, isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { TO } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { AxesHelper, BoxGeometry, DoubleSide, MeshBasicMaterial } from "three";
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

    const { length: rowLength, height: rowHeight } = rowGroup.userData;
    const { width: rowWidth } = (rowGroup.children[0] as ModuleGroup).userData;

    const clippingBrush = new Brush(
      new BoxGeometry(rowWidth / 2, rowHeight / 2, rowLength / 2),
      new MeshBasicMaterial({ color: "white", side: DoubleSide })
    );
    clippingBrush.position.set(rowWidth / 4, rowHeight, (rowLength / 4) * 3);
    clippingBrush.scale.setScalar(1.1);
    clippingBrush.updateMatrixWorld();

    addObjectToScene(clippingBrush);

    let s = true;

    window.addEventListener("keydown", (event) => {
      // Spacebar or Enter key
      if (event.key === "x" || event.key === "X") {
        if (s) {
          rowGroup.createClippedBrushes(clippingBrush);
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
