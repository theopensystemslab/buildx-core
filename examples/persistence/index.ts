import { defaultCachedHousesOps, localHousesTE } from "@/data/user/houses";
import { cachedHouseTypesTE, HouseGroup } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { A, NEA, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";

// right-click delete house

// persist

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  onRightClickBuildElement: (x) => {
    x.elementGroup.houseGroup.delete();
  },
});

pipe(
  localHousesTE,
  TE.chain(flow(A.traverse(TE.ApplicativePar)(createHouseGroupTE))),
  TE.map(
    A.map((houseGroup) => {
      scene.addHouseGroup(houseGroup);
    })
  )
)();

pipe(
  cachedHouseTypesTE,
  TE.map((houseTypes) => {
    window.addEventListener("keydown", ({ key }) => {
      const numbers = NEA.range(0, houseTypes.length - 1);

      if (key === "m") {
        scene.contextManager?.contextUp();
      }

      if (key === "r") {
        scene.traverse((node) => {
          if (node instanceof HouseGroup) {
            node.managers.layouts.resetToHouseTypeLayoutGroup();
          }
        });
      }

      if (key === "x") {
        scene.traverse((node) => {
          if (node instanceof HouseGroup) {
            node.managers.cuts?.toggleXCut();
            node.managers.cuts?.createClippedBrushes(node);
            node.managers.cuts?.showAppropriateBrushes(node);
            // node.managers.cuts?.syncActiveLayout();
          }
        });
      }
      if (key === "z") {
        scene.traverse((node) => {
          if (node instanceof HouseGroup) {
            node.managers.cuts?.toggleZCut();
            node.managers.cuts?.createClippedBrushes(node);
            // node.managers.cuts?.syncActiveLayout();
            node.managers.cuts?.showAppropriateBrushes(node);
          }
        });
      }

      if (numbers.includes(Number(key))) {
        pipe(
          houseTypes,
          A.lookup(Number(key)),
          TE.fromOption(() =>
            Error(
              `no houseType ${key} in houseTypes of length ${houseTypes.length}`
            )
          ),
          TE.chain(({ id: houseTypeId, systemId, dnas }) =>
            createHouseGroupTE({
              systemId,
              dnas,
              houseId: nanoid(),
              houseTypeId,
            })
          ),
          TE.map((houseGroup) => {
            scene.addHouseGroup(houseGroup);
          })
        )();
      }
    });
  })
)();
