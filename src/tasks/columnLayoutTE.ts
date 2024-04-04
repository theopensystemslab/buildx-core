import {
  cachedElementsTE,
  cachedHouseTypesTE,
  cachedMaterialsTE,
  cachedModelTE,
  cachedModulesTE,
} from "@/build-systems/cache";
import {
  createColumnLayout,
  dnasToModules,
  modulesToMatrix,
} from "@/layouts/ops";
import { createColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { A, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { getInitialThreeMaterial } from "./defaultory";

const columnLayoutTE = ({ houseTypeIndex }: { houseTypeIndex: number }) =>
  pipe(
    sequenceT(TE.ApplicativePar)(
      cachedHouseTypesTE,
      cachedModulesTE,
      cachedElementsTE,
      cachedMaterialsTE
    ),
    TE.flatMap(([houseTypes, buildModules, elements, materials]) =>
      pipe(
        houseTypes,
        A.lookup(houseTypeIndex),
        TE.fromOption(() =>
          Error(`no house type at index ${houseTypeIndex} on ${houseTypes}`)
        ),
        TE.flatMap(({ systemId, dnas }) =>
          pipe(
            dnas,
            dnasToModules({ systemId, buildModules }),
            modulesToMatrix,
            createColumnLayout,
            (layout) =>
              pipe(
                createColumnLayoutGroup({
                  systemId,
                  layout,
                  dnas,
                  getBuildElement: ({ systemId, ifcTag }) =>
                    pipe(
                      elements,
                      A.findFirst(
                        (x) => x.systemId === systemId && x.ifcTag === ifcTag
                      ),
                      TE.fromOption(() => Error("no element!"))
                    ),
                  getBuildModel: cachedModelTE,
                  vanillaColumnGetter: () => TE.of(undefined as any),
                  getInitialThreeMaterial: getInitialThreeMaterial(
                    elements,
                    materials
                  ),
                })
              )
          )
        )
      )
    )
  );

export default columnLayoutTE;
