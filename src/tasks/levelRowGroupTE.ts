import { cachedHouseTypesTE, cachedModulesTE } from "@/build-systems/cache";
import { createRowLayout, dnasToModules, modulesToRows } from "@/layouts/init";
import { defaultRowGroupCreator } from "@/three/objects/house/RowGroup";
import { A, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const levelRowGroupTE = ({
  houseTypeIndex,
  rowIndex,
}: {
  houseTypeIndex: number;
  rowIndex: number;
}) =>
  pipe(
    sequenceT(TE.ApplicativePar)(cachedHouseTypesTE, cachedModulesTE),
    TE.flatMap(([houseTypes, buildModules]) =>
      pipe(
        houseTypes,
        A.lookup(houseTypeIndex),
        TE.fromOption(() =>
          Error(
            `house type at index ${houseTypeIndex} not found in houseTypes ${houseTypes}`
          )
        ),
        TE.flatMap(({ systemId, dnas }) =>
          pipe(
            dnas,
            dnasToModules({ systemId, buildModules }),
            modulesToRows,
            createRowLayout,
            (layout) =>
              pipe(
                layout,
                A.lookup(rowIndex),
                TE.fromOption(() =>
                  Error(`rowIndex ${rowIndex} not found in layout ${layout}`)
                ),
                TE.flatMap((row) =>
                  defaultRowGroupCreator({
                    ...row,
                    endColumn: false,
                  })
                )
              )
          )
        )
      )
    )
  );

export default levelRowGroupTE;
