import { cachedHouseTypesTE } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { cachedHousesTE, defaultCachedHousesOps } from "@/data/user/houses";
import { A, NEA, TE, pipeLog } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";
import { OutputsWorker } from "@/three/workers";

// right-click delete house

// persist

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  onRightClickBuildElement: (x) => {
    x.elementGroup.houseGroup.delete();
  },
});

pipe(
  cachedHousesTE,
  TE.chain(flow(A.traverse(TE.ApplicativePar)(houseGroupTE))),
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

      console.log("hello?");

      if (numbers.includes(Number(key))) {
        pipe(
          houseTypes,
          A.lookup(Number(key)),
          pipeLog,
          TE.fromOption(() =>
            Error(
              `no houseType ${key} in houseTypes of length ${houseTypes.length}`
            )
          ),
          TE.chain(({ id: houseTypeId, systemId, dnas }) =>
            houseGroupTE({
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

new OutputsWorker();
