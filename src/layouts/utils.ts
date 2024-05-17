import { BuildModule, StructuredDna } from "@/build-systems/remote/modules";
import { A, Num, O, Ord, R, SG } from "@/utils/functions";
import { abs, hamming } from "@/utils/math";
import { sum } from "fp-ts-std/Array";
import { values } from "fp-ts-std/Record";
import { pipe } from "fp-ts/lib/function";

export const keysHamming =
  (ks: Array<keyof StructuredDna>) => (a: BuildModule, b: BuildModule) =>
    pipe(
      ks,
      A.map((k): [string, number] => {
        switch (typeof a.structuredDna[k]) {
          case "string":
            return [
              k,
              hamming(
                a.structuredDna[k] as string,
                b.structuredDna[k] as string
              ),
            ];
          case "number":
            return [
              k,
              abs(
                (a.structuredDna[k] as number) - (b.structuredDna[k] as number)
              ),
            ];
          default:
            throw new Error(
              `structuredDna key ${k} type ${typeof a.structuredDna[k]} `
            );
        }
      }),
      R.fromFoldable(SG.first<number>(), A.Foldable)
    );

export const keysHammingTotal =
  (ks: Array<keyof StructuredDna>) => (a: BuildModule, b: BuildModule) =>
    pipe(keysHamming(ks)(a, b), values, sum);

export const topCandidateByHamming =
  (
    targetModule: BuildModule,
    ks: Array<keyof StructuredDna> = [
      "gridUnits",
      "internalLayoutType",
      "stairsType",
      "windowTypeEnd",
      "windowTypeSide1",
      "windowTypeSide2",
      "windowTypeTop",
    ]
  ) =>
  (candidateModules: BuildModule[]): O.Option<BuildModule> =>
    pipe(
      candidateModules,
      A.map((m): [BuildModule, number] => [
        m,
        keysHammingTotal(ks)(targetModule, m),
      ]),
      A.sort(
        pipe(
          Num.Ord,
          Ord.contramap(([, n]: [BuildModule, number]) => n)
        )
      ),
      A.head,
      O.map(([m]) => m)
    );

export const filterCompatibleModules =
  (
    ks: Array<keyof StructuredDna> = [
      "sectionType",
      "positionType",
      "levelType",
      "gridType",
    ]
  ) =>
  (moduleA: BuildModule) =>
    A.filter(
      (moduleB: BuildModule) =>
        moduleB.systemId === moduleA.systemId &&
        ks.reduce(
          (acc: boolean, k) =>
            acc && moduleB.structuredDna[k] === moduleA.structuredDna[k],
          true
        )
    );
