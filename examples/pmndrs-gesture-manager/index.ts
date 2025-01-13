import { defaultCachedHousesOps } from "@/data/user/houses";
import { allBuildSystemsData } from "@/index";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { addKeyHelperListeners } from "@@/examples/utils";

class GestureManager {
  scene: BuildXScene;
  constructor(scene: BuildXScene) {
    this.scene = scene;
  }
}

allBuildSystemsData().then(() => {
  const scene = new BuildXScene({
    ...defaultCachedHousesOps,
    onRightClickBuildElement: (x) => {
      x.elementGroup.houseGroup.delete();
    },
    createGestureManager: (scene) => new GestureManager(scene),
  });

  addKeyHelperListeners(scene);
});
