import { cachedModulesTE } from "@/build-systems/cache";
import { BuildModule } from "@/build-systems/remote/modules";
import { createColumn } from "@/layouts/ops";
import { A, S, TE, all } from "@/utils/functions";
import { contramap } from "fp-ts/lib/Ord";
import { pipe } from "fp-ts/lib/function";

export const getVanillaModule = ({
  systemId,
  sectionType,
  positionType,
  levelType,
  gridType,
}: {
  systemId: string;
  sectionType?: string;
  positionType?: string;
  levelType?: string;
  gridType?: string;
}) =>
  pipe(
    cachedModulesTE,
    TE.chain((xs) => {
      return pipe(
        xs,
        A.filter((sysModule) =>
          all(
            sysModule.systemId === systemId,
            sectionType
              ? sysModule.structuredDna.sectionType === sectionType
              : true,
            positionType
              ? sysModule.structuredDna.positionType === positionType
              : true,
            levelType ? sysModule.structuredDna.levelType === levelType : true,
            gridType ? sysModule.structuredDna.gridType === gridType : true
          )
        ),
        A.sort(
          pipe(
            S.Ord,
            contramap((m: BuildModule) => m.dna)
          )
        ),
        A.head,
        TE.fromOption(() => Error(`no A.head at getVanillaModule`))
      );
    })
  );

export const createVanillaColumn = ({
  systemId,
  levelTypes,
  sectionType,
}: {
  systemId: string;
  sectionType: string;
  levelTypes: string[];
}) =>
  pipe(
    levelTypes,
    A.traverse(TE.ApplicativeSeq)((levelType) =>
      pipe(
        getVanillaModule({
          systemId,
          sectionType,
          levelType,
          positionType: "MID",
        }),
        TE.map((buildModule) => [buildModule])
      )
    ),
    TE.map(createColumn)
  );
