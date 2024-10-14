import { defaultCachedHousesOps, localHousesTE } from "@/data/user/houses";
import { cachedBlocksTE, cachedHouseTypesTE, HouseGroup } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { A, NEA, pipeLogWith, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";
import OutputsWorker from "./outputs.worker?worker";

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

new OutputsWorker();

console.log("yo");

pipe(
  cachedBlocksTE,
  TE.map((blocks) => {
    console.log("Blocks received:", blocks);
    return blocks;
  }),
  pipeLogWith(() => "hello?"),
  TE.map(
    A.map((block) => {
      console.log("Processing block:", block);
      const image = new Image();
      if (block.imageBlob) {
        image.src = URL.createObjectURL(block.imageBlob);
      }
      console.log("Image created:", image);
    })
  ),
  TE.mapLeft((error) => {
    console.error("Error in cachedBlocksTE pipeline:", error);
    return error;
  })
)().catch((e) => console.error("Caught error:", e));
