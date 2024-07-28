import { BuildXScene, defaultCachedHousesOps } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import { TE } from "@/utils/functions";
import { addNumkeyHouseCreateListeners } from "@@/examples/utils";
import { flow } from "fp-ts/lib/function";
import ProgressShowHideManager from "./ProgressShowHideManager";

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  onRightClickBuildElement: (x) => {
    x.elementGroup.houseGroup.delete();
  },
});

addNumkeyHouseCreateListeners(
  scene,
  flow(
    ({ managers, ...rest }) =>
      createHouseGroupTE({
        ...rest,
        managers: { ...managers, zStretch: undefined },
      }),
    TE.map((x) => {
      // @ts-ignore
      x.managers.zStretch = new ProgressShowHideManager(x);
      return x;
    })
  )
);
