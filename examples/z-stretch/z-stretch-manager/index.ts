import { BuildXScene, defaultCachedHousesOps } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import {
  addKeyHelperListeners,
  defaultExamplesSceneConf,
} from "@@/examples/utils";
import { flow } from "fp-ts/lib/function";

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  ...defaultExamplesSceneConf,
});

addKeyHelperListeners(
  scene,
  flow(({ managers, ...rest }) =>
    createHouseGroupTE({
      ...rest,
      managers: { ...managers, xStretch: undefined },
    })
  )
);
