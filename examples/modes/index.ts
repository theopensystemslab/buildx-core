import { cachedHouseTypesTE } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { A, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";

const scene = new BuildXScene();

pipe(
  cachedHouseTypesTE,
  TE.chain(
    flow(
      A.lookup(0),
      TE.fromOption(() => Error())
    )
  ),
  TE.chain(({ id: houseTypeId, name, systemId, dnas }) =>
    createHouseGroupTE({
      systemId,
      dnas,
      friendlyName: name,
      houseId: name,
      houseTypeId,
    })
  ),
  TE.map((houseGroup) => {
    scene.addHouseGroup(houseGroup);
  })
)();
