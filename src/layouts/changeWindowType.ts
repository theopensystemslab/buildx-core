import {
  CachedWindowType,
  cachedModulesTE,
  cachedWindowTypesTE,
} from "@/build-systems/cache";
import {
  BuildModule,
  StructuredDna,
  parseDna,
} from "@/build-systems/remote/modules";
import { getVanillaModule } from "@/tasks/vanilla";
import { ColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { Side } from "@/three/utils/camera";
import { A, O, TE, compareProps, someOrError } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { columnLayoutToDnas } from "./init";
import { modifyLayoutAt } from "./mutations";
import { ColumnLayout } from "./types";

type AltWindowTypeLayout = {
  layout: ColumnLayout;
  dnas: string[];
  windowType: CachedWindowType;
  candidate: BuildModule;
};

export type AltWindowTypeLayoutGroupOption = {
  layoutGroup: ColumnLayoutGroup;
  windowType: CachedWindowType;
};

export const getAltWindowTypeLayouts = ({
  columnIndex,
  rowIndex,
  moduleIndex,
  side,
  currentLayout,
  currentDnas,
}: {
  currentLayout: ColumnLayout;
  currentDnas: string[];
  columnIndex: number;
  rowIndex: number;
  moduleIndex: number;
  side: Side;
}): TE.TaskEither<
  Error,
  { alts: AltWindowTypeLayout[]; current: AltWindowTypeLayout }
> =>
  pipe(
    cachedWindowTypesTE,
    TE.chain((windowTypes) =>
      pipe(
        currentLayout,
        A.lookup(columnIndex),
        O.chain(({ positionedRows }) =>
          pipe(
            positionedRows,
            A.lookup(rowIndex),
            O.chain(({ positionedModules }) =>
              pipe(positionedModules, A.lookup(moduleIndex))
            )
          )
        ),
        TE.fromOption(() =>
          Error(
            `no module at [${columnIndex},${rowIndex},${moduleIndex}] in layout: ${JSON.stringify(
              currentLayout,
              null,
              2
            )}`
          )
        ),
        // current module
        TE.chain((positionedModule) => {
          const {
            module,
            module: {
              dna,
              systemId,
              structuredDna: { sectionType, positionType, levelType, gridType },
            },
          } = positionedModule;
          const moduleWindowTypeAlts = getModuleWindowTypeAlts({
            systemId,
            dna,
            side,
          });
          const vanillaModule = getVanillaModule({
            systemId,
            sectionType,
            positionType,
            gridType,
            levelType,
          });

          const currentWindowType = pipe(
            getWindowType(windowTypes, module.structuredDna, side),
            someOrError(`no window type`)
          );

          const currentAltWindowTypeLayout: AltWindowTypeLayout = {
            candidate: module,
            dnas: currentDnas,
            layout: currentLayout,
            windowType: currentWindowType,
          };

          return sequenceT(TE.ApplicativePar)(
            moduleWindowTypeAlts,
            vanillaModule,
            TE.of(currentAltWindowTypeLayout)
          );
        }),
        TE.map(([alts, vanillaModule, currentAltWindowTypeLayout]) =>
          pipe(
            alts,
            A.map((candidate) => {
              return pipe(
                modifyLayoutAt(
                  currentLayout,
                  columnIndex,
                  rowIndex,
                  moduleIndex,
                  candidate,
                  vanillaModule
                ),
                (layout) => {
                  const dnas = columnLayoutToDnas(layout);
                  const windowType = pipe(
                    getWindowType(windowTypes, candidate.structuredDna, side),
                    someOrError(`no window type`)
                  );

                  return {
                    candidate,
                    layout,
                    dnas,
                    windowType,
                  };
                }
              );
            }),
            (alts) => {
              // const foo = alts[0]
              // const bar = currentLayout
              // getWindowType(windowTypes, )
              return { alts, current: currentAltWindowTypeLayout };
            }
          )
        )
      )
    )
  );

export const getModuleWindowTypeAlts = ({
  systemId,
  dna,
  side,
}: {
  systemId: string;
  dna: string;
  side: Side;
}): TE.TaskEither<Error, BuildModule[]> => {
  const currentDna = parseDna(dna);

  const { levelType, positionType, windowTypeTop, windowTypeEnd } = currentDna;

  return pipe(
    cachedModulesTE,
    TE.map((looseCandidates) =>
      pipe(
        looseCandidates,
        A.filter((candidate) => {
          let check =
            candidate.systemId === systemId &&
            candidate.dna !== dna &&
            compareProps(candidate.structuredDna, currentDna, [
              "sectionType",
              "positionType",
              "levelType",
              "gridType",
            ]);

          if (!check) return false;

          if (positionType === "END") {
            return candidate.structuredDna.windowTypeEnd !== windowTypeEnd;
          }

          if (levelType[0] === "R") {
            return candidate.structuredDna.windowTypeTop !== windowTypeTop;
          }

          const bool =
            side === "RIGHT"
              ? compareProps(candidate.structuredDna, currentDna, [
                  "windowTypeEnd",
                  "windowTypeTop",
                  "windowTypeSide1",
                ]) &&
                candidate.structuredDna.windowTypeSide2 !==
                  currentDna.windowTypeSide2
              : compareProps(candidate.structuredDna, currentDna, [
                  "windowTypeEnd",
                  "windowTypeTop",
                  "windowTypeSide2",
                ]) &&
                candidate.structuredDna.windowTypeSide1 !==
                  currentDna.windowTypeSide1;

          return bool;
        })
      )
    )
  );
};

export const getWindowType = (
  windowTypes: CachedWindowType[],
  structuredDna: StructuredDna,
  side: Side
) =>
  pipe(
    windowTypes,
    A.findFirst((windowType) => {
      switch (true) {
        case structuredDna.positionType === "END":
          return windowType.code === structuredDna.windowTypeEnd;
        case structuredDna.levelType[0] === "R":
          return windowType.code === structuredDna.windowTypeTop;
        // left = windowTypeSide2
        case side === "RIGHT":
          return windowType.code === structuredDna.windowTypeSide2;
        // right = windowTypeSide1
        case side === "LEFT":
          return windowType.code === structuredDna.windowTypeSide1;
        default:
          return false;
      }
    })
  );
