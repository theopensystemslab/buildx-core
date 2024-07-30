import { BuildXScene, defaultCachedHousesOps } from "@/index";
import { addNumkeyHouseCreateListeners } from "@@/examples/utils";

console.log("hey");

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  onRightClickBuildElement: (x) => {
    x.elementGroup.houseGroup.delete();
  },
});

addNumkeyHouseCreateListeners(scene);
