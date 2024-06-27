import { cachedHouseTypesTE } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
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
        houseGroup.cutsManager?.debugClippingBrush();
      }
      if (ev.key === "x") {
        houseGroup.cutsManager?.toggleXCut();
        houseGroup.cutsManager?.syncActiveLayout();
      }
      if (ev.key === "z") {
        houseGroup.cutsManager?.toggleZCut();
        houseGroup.cutsManager?.syncActiveLayout();
      }
      if (ev.key === "y") {
        houseGroup.cutsManager?.toggleGroundCut();
        houseGroup.cutsManager?.syncActiveLayout();
      }
    });
  })
)();
