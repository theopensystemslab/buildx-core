import { BuildXScene, defaultCachedHousesOps } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import { TE } from "@/utils/functions";
import { addNumkeyHouseCreateListeners } from "@@/examples/utils";
import { flow } from "fp-ts/lib/function";
import MovingBookendsManager from "./MovingBookendsManager";

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
        managers: { ...managers, xStretch: undefined },
      }),
    TE.map((x) => {
      x.managers.xStretch = new MovingBookendsManager(x);
      return x;
    })
  )
);
