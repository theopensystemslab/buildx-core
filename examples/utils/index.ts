import {
  BuildXScene,
  cachedHouseTypesTE,
  createHouseGroupTE as defaultHouseGroupTE,
} from "@/index";
import { A, NEA, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";

export const addNumkeyHouseCreateListeners = (
  scene: BuildXScene,
  houseGroupTE: typeof defaultHouseGroupTE = defaultHouseGroupTE
) =>
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

        if (key === "m") {
          scene.contextManager?.contextUp();
        }
      });
    })
  )();
