import { cachedHouseTypesTE, cachedModulesTE } from "@/build-systems/cache";
import { dnasToModules, modulesToMatrix } from "@/layouts/ops";
import { defaultModuleGroupCreator } from "@/three/objects/house/ModuleGroup";
import { A, O, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const moduleGroupTE = ({
  houseTypeIndex,
  columnIndex,
  levelIndex,
  gridGroupIndex,
}: {
  houseTypeIndex: number;
  columnIndex: number;
  levelIndex: number;
  gridGroupIndex: number;
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
            O.chain(A.lookup(levelIndex)),
            O.chain(A.lookup(gridGroupIndex)),
            TE.fromOption(() => Error(``)),
            TE.flatMap((buildModule) =>
              pipe(
                defaultModuleGroupCreator({
                  gridGroupIndex: 0,
                  buildModule: buildModule,
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
