import { cachedModulesTE, cachedSectionTypesTE } from "@/build-systems/cache";
import { BuildModule } from "@/build-systems/remote/modules";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { getVanillaModule } from "@/tasks/vanilla";
import { A, O, T, TE, TO, pipeLog, reduceToOption } from "@/utils/functions";
import { roundp, sign } from "@/utils/math";
import { flow, pipe } from "fp-ts/lib/function";
import { ColumnLayout, PositionedBuildModule, PositionedRow } from "./types";
import { filterCompatibleModules, topCandidateByHamming } from "./utils";

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
        A.traverse(TE.ApplicativeSeq)((positionedColumn) =>
          pipe(
            positionedColumn.positionedRows,
            A.traverse(TE.ApplicativeSeq)((gridGroup) => {
              const {
                positionedModules: modules,
                positionedModules: [
                  {
                    module: {
                      structuredDna: { levelType, positionType, gridType },
                    },
                  },
                ],
              } = gridGroup;

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
                        ...gridGroup,
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

// export const getAltSectionTypeLayouts = ({
//   systemId,
//   layout,
//   sectionType,
// }: {
//   systemId: string;
//   layout: ColumnLayout;
//   sectionType: SectionType;
// }): TE.TaskEither<
//   Error,
//   { layout: ColumnLayout; sectionType: SectionType }[]
// > => {
//   const foo = pipe(
//     sectionType,
//     getOtherSectionTypes,
//     TE.map(
//       flow(
//         A.map((sectionType) =>
//           pipe(
//             { systemId, layout, sectionType },
//             changeLayoutSectionType,
//             TE.map((layout) => {
//               console.log({ layout, sectionType });
//               return { layout, sectionType };
//             })
//           )
//         )
//       )
//     )
//   );

//   return pipe(
//     sectionType,
//     getOtherSectionTypes,
//     TE.chain(
//       A.traverse(TE.ApplicativeSeq)((sectionType) =>
//         pipe(
//           { systemId, layout, sectionType },
//           changeLayoutSectionType,
//           TE.map((layout) => {
//             console.log({ layout, sectionType });
//             return { layout, sectionType };
//           })
//         )
//       )
//     ),
//     TE.map((ys) => {
//       console.log({ ys });
//       return ys;
//     })
//   );
// };

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
  const foo = pipe(
    sectionType,
    getOtherSectionTypes,
    TO.fromTaskEither,
    TO.map((otherSectionTypes) =>
      pipe(
        otherSectionTypes,
        pipeLog,
        A.map((sectionType) =>
          pipe(
            { systemId, layout, sectionType },
            changeLayoutSectionType,
            TE.map((layout) => ({ layout, sectionType })),
            TE.fold(
              () => TO.none, // On failure, return None
              (result) => TO.some(result)
            )
          )
        )
      )
    )
  );

  foo().then(
    O.map(
      A.map((bar) => {
        bar().then(
          O.map((ding) => {
            console.log({ ding });
          })
        );
      })
    )
  );

  // Usage

  return TE.of([]);
  // return TE.fromTaskOption(() => new Error("hey"))(foo);
};
