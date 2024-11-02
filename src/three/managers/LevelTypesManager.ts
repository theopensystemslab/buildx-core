import { unsafeGetLevelType } from "@/data/build-systems";
import {
  AltLevelTypeLayoutGroupOption,
  getAltLevelTypeLayouts,
} from "@/layouts/changeLevelType";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { createColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { ScopeElement } from "../objects/types";
import { hideObject } from "../utils/layers";

export type LevelTypesChangeInfo = {
  target: ScopeElement;
  allOpts: Array<AltLevelTypeLayoutGroupOption>;
  altOpts: Array<AltLevelTypeLayoutGroupOption>;
  currentOpt: AltLevelTypeLayoutGroupOption;
};

class LevelTypesManager {
  houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  private getAltLevelTypeLayouts(rowIndex: number) {
    const { systemId } = this.houseGroup.userData;
    const currentLayoutGroup = this.houseGroup.unsafeActiveLayoutGroup;
    const currentLayout = currentLayoutGroup.userData.layout;
    const currentLevelTypeCode =
      currentLayout[0].positionedRows[rowIndex].levelType;

    return getAltLevelTypeLayouts({
      systemId,
      currentLayout,
      currentLevelTypeCode,
      rowIndex,
    });
  }

  public getLevelTypesChangeInfo(
    target: ScopeElement
  ): TE.TaskEither<Error, LevelTypesChangeInfo> {
    const { rowIndex } = target;
    const { systemId } = this.houseGroup.userData;

    return pipe(
      this.getAltLevelTypeLayouts(rowIndex),
      TE.chain((alts) =>
        pipe(
          alts,
          A.traverse(TE.ApplicativePar)(({ dnas, layout, levelType }) =>
            pipe(
              createColumnLayoutGroup({
                systemId,
                dnas,
                layout,
              }),
              TE.map((layoutGroup) => {
                // Add and update the new layout group
                this.houseGroup.add(layoutGroup);
                layoutGroup.updateBBs();

                // Apply cuts and brushes
                this.houseGroup.managers.cuts?.createClippedBrushes(
                  layoutGroup
                );
                this.houseGroup.managers.cuts?.showAppropriateBrushes(
                  layoutGroup
                );

                hideObject(layoutGroup);

                return {
                  levelType,
                  layoutGroup,
                };
              })
            )
          ),
          TE.map((altOpts): LevelTypesChangeInfo => {
            const levelType = unsafeGetLevelType({
              systemId,
              code: target.elementGroup.moduleGroup.userData.module
                .structuredDna.levelType,
            });

            const currentOpt: AltLevelTypeLayoutGroupOption = {
              layoutGroup: this.houseGroup.unsafeActiveLayoutGroup,
              levelType,
            };

            return {
              allOpts: [...altOpts, currentOpt],
              currentOpt,
              altOpts,
              target,
            };
          })
        )
      )
    );
  }
}

export default LevelTypesManager;
