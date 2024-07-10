import { cachedModulesTE, BuildModule } from "@/data/build-systems";
import { createColumn } from "@/layouts/init";
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
        A.filter((sysModule) => {
          const a = sysModule.systemId === systemId;
          const b = sectionType
            ? sysModule.structuredDna.sectionType === sectionType
            : true;
          const c = positionType
            ? sysModule.structuredDna.positionType === positionType
            : true;
          const d = levelType
            ? sysModule.structuredDna.levelType === levelType
            : true;
          const e = gridType
            ? sysModule.structuredDna.gridType === gridType
            : true;

          return all(a, b, c, d, e);
        }),
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
    A.traverse(TE.ApplicativePar)((levelType) =>
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
