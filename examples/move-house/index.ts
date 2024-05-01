import { cachedHouseTypesTE } from "@/index";
import columnLayoutGroupTE from "@/tasks/columnLayoutTE";
import createRaycastedScene from "@/three/utils/createRaycastedScene";
import { A, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";

const { scene, render } = createRaycastedScene();

pipe(
  cachedHouseTypesTE,
  TE.flatMap(
    flow(
      A.lookup(1),
      TE.fromOption(() => new Error(`no houseTypeIndex 1`)),
      TE.flatMap(columnLayoutGroupTE)
    )
  ),
  TE.map((columnLayoutGroup) => {
    scene.add(columnLayoutGroup);
    render();
  })
)();
