import {
  BuildXScene,
  cachedHouseTypesTE,
  createHouseGroupTE as defaultHouseGroupTE,
  HouseGroup,
  ScopeElement,
} from "@/index";
import { A, NEA, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { nanoid } from "nanoid";
import { Vector2 } from "three";

export const addKeyHelperListeners = (
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

        if (key === "r") {
          scene.children.forEach((child) => {
            if (child instanceof HouseGroup) {
              child.managers.layouts.resetToHouseTypeLayoutGroup();
            }
          });
        }
      });
    })
  )();

export const addHouseTypeByIndex = (scene: BuildXScene, index: number) => {
  pipe(
    cachedHouseTypesTE,
    TE.map((houseTypes) => {
      const houseType = houseTypes[index];
      return houseType;
    }),
    TE.chain((houseType) =>
      defaultHouseGroupTE({
        systemId: houseType.systemId,
        dnas: houseType.dnas,
        houseId: nanoid(),
        houseTypeId: houseType.id,
      })
    ),
    TE.map((houseGroup) => {
      scene.addHouseGroup(houseGroup);
    })
  )();
};

export const defaultExamplesSceneConf = {
  onRightClickBuildElement: (scopeElement: ScopeElement, _xy: Vector2) => {
    scopeElement.elementGroup.houseGroup.dispose();
  },
};
