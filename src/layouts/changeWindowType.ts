import { cachedModulesTE, cachedWindowTypesTE } from "@/build-systems/cache";
import {
  BuildModule,
  StructuredDna,
  parseDna,
} from "@/build-systems/remote/modules";
import { WindowType } from "@/build-systems/remote/windowTypes";
import { getVanillaModule } from "@/tasks/vanilla";
import { Side } from "@/three/utils/camera";
import { A, O, TE, compareProps, someOrError } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { columnLayoutToDnas } from "./init";
import { modifyLayoutAt } from "./mutations";
import { ColumnLayout } from "./types";

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
            const bool =
              candidate.structuredDna.windowTypeTop !== windowTypeTop;
            if (bool) {
              console.log(`CANDIDATE: ${candidate.dna}`);
            }
            return bool;
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
  windowTypes: WindowType[],
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

export const getAltWindowTypeLayouts = ({
  systemId,
  columnIndex,
  levelIndex,
  moduleIndex,
  side,
  currentLayout,
}: {
  systemId: string;
  currentLayout: ColumnLayout;
  columnIndex: number;
  levelIndex: number;
  moduleIndex: number;
  side: Side;
}) =>
  pipe(
    cachedWindowTypesTE,
    TE.chain((windowTypes) =>
      pipe(
        currentLayout,
        A.lookup(columnIndex),
        O.chain(({ positionedRows }) =>
          pipe(
            positionedRows,
            A.lookup(levelIndex),
            O.chain(({ positionedModules }) =>
              pipe(
                positionedModules,
                A.lookup(moduleIndex),
                O.map(
                  ({
                    module: {
                      dna,
                      structuredDna: {
                        sectionType,
                        positionType,
                        gridType,
                        levelType,
                      },
                    },
                  }) => ({
                    systemId,
                    dna,
                    side,
                    sectionType,
                    positionType,
                    gridType,
                    levelType,
                  })
                )
              )
            )
          )
        ),
        TE.fromOption(() =>
          Error(
            `no module at [${columnIndex},${levelIndex},${moduleIndex}] in layout: ${JSON.stringify(
              currentLayout,
              null,
              2
            )}`
          )
        ),
        TE.chain(
          ({
            systemId,
            dna,
            side,
            sectionType,
            positionType,
            levelType,
            gridType,
          }) => {
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
            return sequenceT(TE.ApplicativePar)(
              moduleWindowTypeAlts,
              vanillaModule
            );
          }
        ),
        TE.map(([alts, vanillaModule]) =>
          pipe(
            alts,
            A.map((candidate) => {
              return pipe(
                modifyLayoutAt(
                  currentLayout,
                  columnIndex,
                  levelIndex,
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
            })
          )
        )
      )
    )
  );

// validatePositionedColumn(augColumn)

// const candidates: {
//   candidate: Module
//   layout: ColumnLayout
//   dnas: string[]
//   windowType: WindowType
// }[] = []

// const candidates = pipe(
//   await getWindowTypeAlternatives({ systemId, dna, side }),
//   A.map((candidate) => {
//     const updatedColumn = pipe(
//       augColumn,
//       produce((draft: AugPosCol) => {
//         const origRow = draft.positionedRows[levelIndex]
//         const newRow = swapModuleInRow(origRow, gridGroupIndex, candidate)

//         const gridUnitDelta = newRow.gridUnits - origRow.gridUnits

//         if (sign(gridUnitDelta) === 1) {
//           // pad all other rows with gridUnitDelta vanilla
//           for (let i = 0; i < draft.positionedRows.length; i++) {
//             if (i === levelIndex) continue

//             draft.positionedRows[i] = addModulesToRow(
//               draft.positionedRows[i],
//               A.replicate(
//                 gridUnitDelta,
//                 draft.positionedRows[i].vanillaModule
//               )
//             )
//             // validatePositionedRow(draft.positionedRows[i])
//           }
//           draft.positionedRows[levelIndex] = newRow
//           // validatePositionedRow(draft.positionedRows[levelIndex])
//         } else if (sign(gridUnitDelta) === -1) {
//           // pad this column with gridUnitDelta vanilla
//           draft.positionedRows[levelIndex] = addModulesToRow(
//             newRow,
//             A.replicate(gridUnitDelta, newRow.vanillaModule)
//           )
//         }
//         // validatePositionedRow(draft.positionedRows[levelIndex])

//         // validatePositionedColumn(draft)
//       })
//     )

//     validatePositionedColumn(updatedColumn)

//     const lengthDelta =
//       updatedColumn.positionedRows[0].rowLength - updatedColumn.columnLength

//     const nextLayout = pipe(
//       currentLayout,
//       produce((draft: ColumnLayout) => {
//         draft[columnIndex] = {
//           ...updatedColumn,
//           columnLength: updatedColumn.positionedRows[0].rowLength,
//         }

//         for (let i = columnIndex + 1; i < draft.length; i++) {
//           draft[i] = {
//             ...draft[i],
//             z: draft[i].z + lengthDelta,
//           }
//         }
//       })
//     )

//     postVanillaColumn(nextLayout[0])
//     const dnas = columnLayoutToDnas(nextLayout)

//     layoutsDB.houseLayouts.put({ systemId, dnas, layout: nextLayout })

//     return {
//       candidate,
//       layout: nextLayout,
//       dnas,
//       windowType: pipe(
//         getWindowType(windowTypes, candidate, side),
//         someOrError(`no window type`)
//       ),
//     }
//   })
// )
