import {
  BuildXScene,
  cachedHouseTypesTE,
  defaultCachedHousesOps,
} from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";
import DebugAltsManager from "./DebugAltsManager";
import {
  addKeyHelperListeners,
  defaultExamplesSceneConf,
} from "@@/examples/utils";

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  ...defaultExamplesSceneConf,
});

addKeyHelperListeners(
  scene
  // flow(
  //   ({ managers, ...rest }) =>
  //     createHouseGroupTE({
  //       ...rest,
  //       managers: { ...managers, xStretch: undefined },
  //     }),
  //   TE.map((x) => {
  //     x.managers.xStretch = new DebugAltsManager(x);
  //     return x;
  //   })
  // )
);

const index = 3;

pipe(
  cachedHouseTypesTE,
  TE.map((houseTypes) => {
    const houseType = houseTypes[index];
    return houseType;
  }),
  TE.chain((houseType) =>
    createHouseGroupTE({
      systemId: houseType.systemId,
      dnas: houseType.dnas,
      houseId: nanoid(),
      houseTypeId: houseType.id,
      managers: { xStretch: undefined },
    })
  ),
  TE.map((houseGroup) => {
    houseGroup.managers.xStretch = new DebugAltsManager(houseGroup);
    scene.addHouseGroup(houseGroup);
  })
)();
