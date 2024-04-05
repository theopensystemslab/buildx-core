import { createBasicScene } from "@/index";
import columnLayoutTE from "@/tasks/columnLayoutTE";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { TE } from "@/utils/functions";
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
  columnLayoutTE({ houseTypeIndex: 1 }),
  TE.map((columnLayoutGroup) => {
    addObjectToScene(columnLayoutGroup);
  })
)();
