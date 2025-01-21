import { defaultCachedHousesOps, localHousesTE } from "@/data/user/houses";
import { decodeShareUrlPayload } from "@/data/user/utils";
import { cachedHouseTypesTE } from "@/index";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { A, NEA, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";
import OutputsWorker from "./outputs.worker?worker";
import SharingWorker from "./sharing.worker?worker";
import { defaultExamplesSceneConf } from "@@/examples/utils";

// right-click delete house

// persist

const scene = new BuildXScene({
  ...defaultCachedHousesOps,
  ...defaultExamplesSceneConf,
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
new SharingWorker();

// liveQuery(() => userCache.projectData.get(PROJECT_DATA_KEY)).subscribe(
//   (projectData) => {
//     if (projectData && projectData.shareUrlPayload !== null) {
//       const decodedShareUrlPayload = decodeShareUrlPayload(
//         projectData.shareUrlPayload
//       );
//       console.log({ decodedShareUrlPayload });
//     }
//   }
// );

const urlParams = new URLSearchParams(window.location.search);
const queryValue = urlParams.get("q");

if (queryValue) {
  // Use the queryValue for your application state
  console.log("Query value:", queryValue);

  try {
    const decodedShareUrlPayload = decodeShareUrlPayload(queryValue);
    console.log({ decodedShareUrlPayload });
  } catch (error) {
    console.error("Error decoding share URL payload:", error);
  }
} else {
  // Handle the case when the 'q' parameter is not present
  console.log("No query value provided");
}
