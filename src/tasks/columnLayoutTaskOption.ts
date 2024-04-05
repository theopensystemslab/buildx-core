import {
  cachedElementsTE,
  cachedHouseTypesTE,
  cachedMaterialsTE,
  getCachedModelTE,
  cachedModulesTE,
} from "@/build-systems/cache";
import {
  createColumnLayout,
  dnasToModules,
  modulesToMatrix,
} from "@/layouts/ops";
import { getBuildElement, getInitialThreeMaterial } from "@/tasks/defaultory";
import { createColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { A, T, TE, TO } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const columnLayoutTaskOption = ({
  houseTypeIndex,
}: {
  houseTypeIndex: number;
}) =>
  pipe(
    sequenceT(TE.ApplicativePar)(
      cachedHouseTypesTE,
      cachedModulesTE,
      cachedElementsTE,
      cachedMaterialsTE
    ),
    TO.fromTaskEither,
    TO.chain(([houseTypes, buildModules, elements, materials]) =>
      pipe(
        houseTypes,
        A.lookup(houseTypeIndex),
        TO.fromOption,
        TO.chain(({ systemId, dnas }) =>
          pipe(
            dnas,
            dnasToModules({ systemId, buildModules }),
            modulesToMatrix,
            createColumnLayout,
            (layout) =>
              pipe(
                createColumnLayoutGroup({
                  layout,
                  dnas,
                  systemId,
                  getBuildElement: getBuildElement(elements),
                  getBuildModel: getCachedModelTE,
                  getInitialThreeMaterial: getInitialThreeMaterial(
                    elements,
                    materials
                  ),
                  vanillaColumnGetter: () => T.of(undefined as any),
                }),
                TO.fromTask
              )
          )
        )
      )
    )
  );

export default columnLayoutTaskOption;
