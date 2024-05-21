import { cachedHouseTypesTE, cachedModulesTE } from "@/build-systems/cache";
import { dnasToModules, modulesToMatrix } from "@/layouts/init";
import { defaultModuleGroupCreator } from "@/three/objects/house/ModuleGroup";
import { A, O, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const moduleGroupTE = ({
  houseTypeIndex,
  columnIndex,
  rowIndex,
  moduleIndex,
}: {
  houseTypeIndex: number;
  columnIndex: number;
  rowIndex: number;
  moduleIndex: number;
}) =>
  pipe(
    sequenceT(TE.ApplicativePar)(cachedHouseTypesTE, cachedModulesTE),
    TE.flatMap(([houseTypes, buildModules]) =>
      pipe(
        houseTypes,
        A.lookup(houseTypeIndex),
        TE.fromOption(() => Error(``)),
        TE.flatMap(({ systemId, dnas }) =>
          pipe(
            dnas,
            dnasToModules({ systemId, buildModules }),
            modulesToMatrix,
            A.lookup(columnIndex),
            O.chain(A.lookup(rowIndex)),
            O.chain(A.lookup(moduleIndex)),
            TE.fromOption(() => Error(``)),
            TE.flatMap((buildModule) =>
              pipe(
                defaultModuleGroupCreator({
                  moduleIndex: 0,
                  buildModule,
                  z: 0,
                  flip: true,
                })
              )
            )
          )
        )
      )
    )
  );

export default moduleGroupTE;
