import {
  cachedElementsTE,
  cachedHouseTypesTE,
  cachedMaterialsTE,
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

const columnLayoutTE = ({ houseTypeIndex }: { houseTypeIndex: number }) =>
  pipe(
    sequenceT(TE.ApplicativePar)(
      cachedHouseTypesTE,
      cachedModulesTE,
      cachedElementsTE,
      cachedMaterialsTE
    ),
    TE.flatMap(([houseTypes, buildModules]) =>
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
                })
              )
          )
        )
      )
    )
  );

export default columnLayoutTE;
