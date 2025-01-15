import { defaultCachedHousesOps } from "@/data/user/houses";
import { allBuildSystemsData } from "@/index";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { addKeyHelperListeners } from "@@/examples/utils";

allBuildSystemsData().then(() => {
  const scene = new BuildXScene({
    ...defaultCachedHousesOps,
    onRightClickBuildElement: (x) => {
      x.elementGroup.houseGroup.removeFromParent();
    },
  });

  addKeyHelperListeners(scene);
});
