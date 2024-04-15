import { cachedHouseTypesTE, cachedModulesTE } from "@/build-systems/cache";
import { createRowLayout, dnasToModules, modulesToRows } from "@/layouts/ops";
import { defaultGridGroupCreator } from "@/three/objects/house/GridGroup";
import { A, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const levelRowGroupTE = ({
  houseTypeIndex,
  levelIndex,
}: {
  houseTypeIndex: number;
  levelIndex: number;
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
                A.lookup(levelIndex),
                TE.fromOption(() =>
                  Error(
                    `levelIndex ${levelIndex} not found in layout ${layout}`
                  )
                ),
                TE.flatMap((row) =>
                  defaultGridGroupCreator({
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
