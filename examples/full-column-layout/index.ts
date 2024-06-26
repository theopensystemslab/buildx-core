import { cachedElementsTE, cachedHouseTypesTE } from "@/build-systems/cache";
import { createBasicScene } from "@/index";
import columnLayoutGroupTE from "@/tasks/columnLayoutTE";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { A, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { AxesHelper, BoxGeometry, DoubleSide, MeshBasicMaterial } from "three";
import { Brush } from "three-bvh-csg";
import gui from "./gui";

const { addObjectToScene, render } = createBasicScene({
  outliner: (object) => {
    return object.parent && isModuleGroup(object.parent)
      ? object.parent.children
      : [];
  },
});

addObjectToScene(new AxesHelper());

pipe(
  cachedHouseTypesTE,
  TE.flatMap(
    flow(
      A.lookup(1),
      TE.fromOption(() => new Error(`no houseTypeIndex 1`)),
      TE.flatMap(columnLayoutGroupTE)
    )
  ),
  TE.map((columnLayoutGroup) => {
    addObjectToScene(columnLayoutGroup);

    const {
      depth: layoutLength,
      height: layoutHeight,
      width: layoutWidth,
    } = columnLayoutGroup.userData;

    const clippingBrush = new Brush(
      new BoxGeometry(layoutWidth, layoutHeight / 2, layoutLength / 2),
      new MeshBasicMaterial({ color: "white", side: DoubleSide })
    );
    clippingBrush.position.set(
      // layoutWidth / 4,
      0,
      0,
      // (layoutHeight / 4) * 3,
      (layoutLength / 4) * 3
    );
    clippingBrush.scale.setScalar(1.1);
    clippingBrush.updateMatrixWorld();

    addObjectToScene(clippingBrush);

    let s = true;

    window.addEventListener("keydown", (event) => {
      // Spacebar or Enter key
      if (event.key === "x" || event.key === "X") {
        if (s) {
          columnLayoutGroup.createClippedBrushes(clippingBrush);
          columnLayoutGroup.showClippedBrushes();
        } else {
          columnLayoutGroup.destroyClippedBrushes();
          columnLayoutGroup.showElementBrushes();
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

pipe(
  cachedElementsTE,
  TE.map((elements) => {
    gui({ elements });
  })
)();
