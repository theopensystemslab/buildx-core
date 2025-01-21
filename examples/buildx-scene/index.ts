import { defaultCachedHousesOps } from "@/data/user/houses";
import { allBuildSystemsData } from "@/index";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import {
  addKeyHelperListeners,
  defaultExamplesSceneConf,
} from "@@/examples/utils";

allBuildSystemsData().then(() => {
  const scene = new BuildXScene({
    ...defaultCachedHousesOps,
    ...defaultExamplesSceneConf,
  });

  addKeyHelperListeners(scene);
});
