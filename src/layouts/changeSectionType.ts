import { getVanillaModule } from "@/tasks/vanilla";
import { A, O, TE, reduceToOption, successSeqTE } from "@/utils/functions";
import { roundp, sign } from "@/utils/math";
import { pipe } from "fp-ts/lib/function";
import { ColumnLayout, PositionedBuildModule, PositionedRow } from "./types";
import { filterCompatibleModules, topCandidateByHamming } from "./utils";
import {
  SectionType,
  cachedModulesTE,
  BuildModule,
  cachedSectionTypesTE,
} from "@/data/build-systems";

export const changeLayoutSectionType = ({
  systemId,
  layout,
  sectionType: st,
}: {
  systemId: string;
  layout: ColumnLayout;
  sectionType: SectionType;
}): TE.TaskEither<Error, ColumnLayout> => {
  const { code: sectionType } = st;

  return pipe(
    cachedModulesTE,
    TE.chain((allModules) =>
      pipe(
        layout,
        A.traverse(TE.ApplicativePar)((positionedColumn) =>
          pipe(
            positionedColumn.positionedRows,
            A.traverse(TE.ApplicativePar)((rowGroup) => {
              const {
                positionedModules: modules,
                positionedModules: [
                  {
                    module: {
                      structuredDna: { levelType, positionType, gridType },
                    },
                  },
                ],
              } = rowGroup;

              const vanillaModuleTE = getVanillaModule({
                systemId,
                sectionType,
                positionType,
                levelType,
                gridType,
              });

              return pipe(
                vanillaModuleTE,
                TE.chain((vanillaModule) => {
                  return pipe(
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
                            sectionType: st.code,
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
                    O.map(
                      (modules): PositionedRow => ({
                        ...rowGroup,
                        positionedModules: modules,
                      })
                    ),
                    TE.fromOption(() => new Error("reduceToOption failed"))
                  );
                })
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

export const getOtherSectionTypes = (currentSectionType: SectionType) =>
  pipe(
    cachedSectionTypesTE,
    TE.map(
      A.filter(
        (sectionType) =>
          sectionType.systemId === currentSectionType.systemId &&
          sectionType.code !== currentSectionType.code
      )
    )
  );

export const getAltSectionTypeLayouts = ({
  systemId,
  layout,
  sectionType,
}: {
  systemId: string;
  layout: ColumnLayout;
  sectionType: SectionType;
}): TE.TaskEither<
  Error,
  { layout: ColumnLayout; sectionType: SectionType }[]
> => {
  return pipe(
    sectionType,
    getOtherSectionTypes,
    TE.chain((otherSectionTypes) =>
      pipe(
        otherSectionTypes,
        A.map((sectionType) =>
          pipe(
            { systemId, layout, sectionType },
            changeLayoutSectionType,
            TE.map((layout) => ({ layout, sectionType }))
          )
        ),
        successSeqTE,
        TE.fromTask,
        TE.mapError(() => new Error(`failed changeSectionType`))
      )
    )
  );
};
