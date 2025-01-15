import { BuildXScene, defaultCachedHousesOps } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import { TE } from "@/utils/functions";
import { addKeyHelperListeners } from "@@/examples/utils";
import { flow } from "fp-ts/lib/function";
import VanillaPreparingManager from "./VanillaPreparingManager";

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  onRightClickBuildElement: (x) => {
    x.elementGroup.houseGroup.removeFromParent();
  },
});

addKeyHelperListeners(
  scene,
  flow(
    ({ managers, ...rest }) =>
      createHouseGroupTE({
        ...rest,
        managers: { ...managers, zStretch: undefined },
      }),
    TE.map((x) => {
      // @ts-ignore
      x.managers.zStretch = new VanillaPreparingManager(x);
      return x;
    })
  )
);
