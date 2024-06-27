import { cachedHouseTypesTE } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { A, O, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";

const scene = new BuildXScene();

pipe(
  cachedHouseTypesTE,
  TE.chain(
    flow(
      A.lookup(1),
      TE.fromOption(() => Error())
    )
  ),
  TE.chain(({ id: houseTypeId, name, systemId, dnas }) =>
    houseGroupTE({
      systemId,
      dnas,
      friendlyName: name,
      houseId: name,
      houseTypeId,
    })
  ),
  TE.map((houseGroup) => {
    scene.addHouseGroup(houseGroup);

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "m") {
        houseGroup.modeManager?.up();
      }
      if (ev.key === "d") {
        pipe(
          houseGroup.activeLayoutGroup,
          O.map((x) => {
            x.cutsManager?.debugClippingBrush();
          })
        );
      }
    });
  })
)();
