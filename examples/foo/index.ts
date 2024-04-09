import { createBasicScene } from "@/index";
import columnLayoutTE from "@/tasks/columnLayoutTE";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { AxesHelper } from "three";
import gui from "./gui";
import ElementsManager from "@/three/managers/ElementsManager";
import CutsManager from "@/three/managers/CutsManager";

const { addObjectToScene, render, scene } = createBasicScene({
  outliner: (object) => {
    return object.parent && isModuleGroup(object.parent)
      ? object.parent.children
      : [];
  },
});

addObjectToScene(new AxesHelper());

pipe(
  columnLayoutTE({ houseTypeIndex: 1 }),
  TE.map((columnLayoutGroup) => {
    addObjectToScene(columnLayoutGroup);

    const elementsManager = new ElementsManager(columnLayoutGroup);
    const cutsManager = new CutsManager(columnLayoutGroup);

    gui({
      elementsManager,
      cutsManager,
      render,
      scene,
    });
  })
)();
