import { cachedHouseTypesTE } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import {
  deleteCachedHouse,
  createCachedHouse,
  updateCachedHouse,
} from "@/data/user/houses";
import { A, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";

const scene = new BuildXScene({
  onHouseCreate: (house) => {
    createCachedHouse(house)();
  },
  onHouseDelete: (house) => {
    deleteCachedHouse(house)();
  },
  onHouseUpdate: (houseId, changes) => {
    updateCachedHouse(houseId, changes);
  },
  onRightClickBuildElement: (x) => {
    x.elementGroup.houseGroup.delete();
  },
});

pipe(
  cachedHouseTypesTE,
  TE.chain(
    flow(
      A.lookup(2),
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

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "m") {
        scene.contextManager?.contextUp();
      }
      if (ev.key === "d") {
        houseGroup.managers.cuts?.debugClippingBrush();
      }
      if (ev.key === "x") {
        houseGroup.managers.cuts?.toggleXCut();
        houseGroup.managers.cuts?.syncActiveLayout();
      }
      if (ev.key === "z") {
        houseGroup.managers.cuts?.toggleZCut();
        houseGroup.managers.cuts?.syncActiveLayout();
      }
      if (ev.key === "y") {
        houseGroup.managers.cuts?.toggleGroundCut();
        houseGroup.managers.cuts?.syncActiveLayout();
      }
    });
  })
)();
