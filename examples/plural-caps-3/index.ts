import { createBasicScene } from "@/index";
import getModuleGroupTO from "@/tasks/getModuleGroupTO";
import { isModuleGroup } from "@/three/objects/ModuleGroup";
import { TO } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { AxesHelper } from "three";

const { addObjectToScene } = createBasicScene({
  outliner: (object) => {
    return object.parent && isModuleGroup(object.parent)
      ? object.parent.children
      : [];
  },
});

addObjectToScene(new AxesHelper());

pipe(
  getModuleGroupTO({
    houseTypeIndex: 0,
    columnIndex: 3,
    levelIndex: 1,
    gridGroupIndex: 0,
  }),
  TO.map((moduleGroup) => {
    const { height } = moduleGroup.userData;

    addObjectToScene(moduleGroup);

    window.addEventListener("keydown", (event) => {
      // Spacebar or Enter key
      if (event.key === " " || event.key === "Enter") {
        moduleGroup.createLevelCutBrushes(height / 2);
        moduleGroup.showClippedBrushes();
      }
    });
  })
)();
