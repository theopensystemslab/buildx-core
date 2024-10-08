import {
  BuildModule,
  LevelType,
  cachedLevelTypesTE,
  cachedModulesTE,
} from "@/data/build-systems";
import { getVanillaModule } from "@/tasks/vanilla";
import { ColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import {
  A,
  O,
  TE,
  reduceToOption,
  someOrError,
  successSeqTE,
} from "@/utils/functions";
import { roundp, sign } from "@/utils/math";
import { flow, pipe } from "fp-ts/lib/function";
import { columnLayoutToDnas } from "./init";
import { ColumnLayout, PositionedBuildModule, PositionedRow } from "./types";
import { filterCompatibleModules, topCandidateByHamming } from "./utils";

type AltLevelTypeLayoutOption = {
  layout: ColumnLayout;
  levelType: LevelType;
  dnas: string[];
};

export type AltLevelTypeLayoutGroupOption = Omit<
  AltLevelTypeLayoutOption,
  "layout" | "dnas"
> & {
  layoutGroup: ColumnLayoutGroup;
};

export const getAltLevelTypeLayouts = ({
  systemId,
  currentLayout,
  currentLevelTypeCode,
  rowIndex,
}: {
  systemId: string;
  currentLayout: ColumnLayout;
  currentLevelTypeCode: string;
  rowIndex: number;
}): TE.TaskEither<Error, AltLevelTypeLayoutOption[]> =>
  pipe(
    cachedLevelTypesTE,
    TE.map(
      flow(
        A.partition((x) => x.code !== currentLevelTypeCode),
        ({ left: currentLevelTypes, right: otherLevelTypes }) =>
          pipe(
            currentLevelTypes,
            A.head,
            someOrError(`couldn't head currentLevelTypes`),
            (currentLevelType) => ({
              otherLevelTypes: otherLevelTypes.filter(
                (x) => x.code[0] === currentLevelType.code[0]
              ),
              currentLevelType,
            })
          )
      )
    ),
    TE.chain(({ otherLevelTypes, currentLevelType }) =>
      pipe(
        otherLevelTypes,
        A.map(
          (
            levelType
          ): TE.TaskEither<
            Error,
            {
              layout: ColumnLayout;
              levelType: LevelType;
              dnas: string[];
            }
          > =>
            pipe(
              changeLevelTypeLayout({
                systemId,
                layout: currentLayout,
                nextLevelType: levelType,
                prevLevelType: currentLevelType,
                rowIndex,
              }),
              TE.map((layout) => {
                const dnas = columnLayoutToDnas(layout);

                return {
                  layout,
                  levelType,
                  dnas,
                };
              })
            )
        ),
        successSeqTE,
        TE.fromTask,
        TE.mapError(() => new Error(`failed changeLevelType`))
      )
    )
  );

const changeLevelTypeLayout = ({
  systemId,
  layout,
  prevLevelType,
  nextLevelType,
  rowIndex,
}: {
  systemId: string;
  layout: ColumnLayout;
  nextLevelType: LevelType;
  prevLevelType: LevelType;
  rowIndex: number;
}): TE.TaskEither<Error, ColumnLayout> => {
  const dh = nextLevelType.height - prevLevelType.height;

  return pipe(
    cachedModulesTE,
    TE.chain((allModules) =>
      pipe(
        layout,
        A.traverse(TE.ApplicativePar)((positionedColumn) =>
          pipe(
            positionedColumn.positionedRows,
            A.traverse(TE.ApplicativePar)((rowGroup) => {
              if (rowGroup.rowIndex !== rowIndex)
                return TE.of({
                  ...rowGroup,
                  y:
                    rowGroup.rowIndex > rowIndex ? rowGroup.y + dh : rowGroup.y,
                });

              const {
                positionedModules: modules,
                positionedModules: [
                  {
                    module: {
                      structuredDna: { sectionType, positionType, gridType },
                    },
                  },
                ],
              } = rowGroup;

              return pipe(
                getVanillaModule({
                  systemId,
                  sectionType,
                  positionType,
                  levelType: nextLevelType.code,
                  gridType,
                }),
                TE.chain((vanillaModule) =>
                  pipe(
                    modules,
                    reduceToOption(
                      O.some([]),
                      (
                        _i,
                        acc: O.Option<PositionedBuildModule[]>,
                        positionedModule
                      ) => {
                        const target = {
                          systemId,
                          structuredDna: {
                            ...positionedModule.module.structuredDna,
                            levelType: nextLevelType.code,
                          },
                        } as BuildModule;

                        const compatModules = pipe(
                          allModules,
                          filterCompatibleModules()(target)
                        );

                        if (compatModules.length === 0) return O.none;

                        return pipe(
                          compatModules,
                          topCandidateByHamming(target),
                          O.map((bestModule) => {
                            const distanceToTarget =
                              target.structuredDna.gridUnits -
                              bestModule.structuredDna.gridUnits;

                            switch (true) {
                              case sign(distanceToTarget) > 0:
                                // fill in some vanilla
                                return [
                                  bestModule,
                                  ...A.replicate(
                                    roundp(
                                      distanceToTarget / vanillaModule.length
                                    ),
                                    vanillaModule
                                  ),
                                ];
                              case sign(distanceToTarget) < 0:
                                // abort and only vanilla
                                return A.replicate(
                                  roundp(
                                    positionedModule.module.length /
                                      vanillaModule.length
                                  ),
                                  vanillaModule
                                );

                              case sign(distanceToTarget) === 0:
                              default:
                                return [bestModule];
                              // swap the module
                            }
                          }),
                          O.map((nextModules) =>
                            pipe(
                              acc,
                              O.map((positionedModules) => [
                                ...positionedModules,
                                ...nextModules.map(
                                  (module, i): PositionedBuildModule => ({
                                    module,
                                    z: positionedModule.z,
                                    moduleIndex: i,
                                  })
                                ),
                              ])
                            )
                          ),
                          O.flatten
                        );
                      }
                    ),
                    O.map((modules): PositionedRow => {
                      return {
                        ...rowGroup,
                        levelType: nextLevelType.code,
                        positionedModules: modules,
                      };
                    }),
                    TE.fromOption(() => Error("foo error"))
                  )
                )
              );
            }),
            TE.map((positionedRows) => ({
              ...positionedColumn,
              positionedRows,
            }))
          )
        )
      )
    )
  );
};
