import {
  AltWindowTypeLayoutGroupOption,
  getAltWindowTypeLayouts,
} from "@/layouts/changeWindowType";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { createColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { ScopeElement } from "../objects/types";
import { Side, getSide } from "../utils/camera";
import { hideObject } from "../utils/layers";

export type OpeningsChangeInfo = {
  side: Side;
  target: ScopeElement;
  allOpts: Array<AltWindowTypeLayoutGroupOption>;
  altOpts: Array<AltWindowTypeLayoutGroupOption>;
  currentOpt: AltWindowTypeLayoutGroupOption;
};

class OpeningsManager {
  houseGroup: HouseGroup;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  getOpeningsChangeInfo(
    target: ScopeElement
  ): TE.TaskEither<Error, OpeningsChangeInfo> {
    const side = getSide(
      this.houseGroup,
      this.houseGroup.scene.cameraControls.camera
    );

    return pipe(
      this.houseGroup.activeLayoutGroup,
      TE.fromOption(() => Error(`no activeLayoutGroup`)),
      TE.chain((activeLayoutGroup) => {
        const {
          userData: { systemId },
        } = this.houseGroup;
        const { layout: currentLayout, dnas: currentDnas } =
          activeLayoutGroup.userData;
        const { columnIndex, rowIndex, moduleIndex } = target;

        return pipe(
          getAltWindowTypeLayouts({
            columnIndex,
            currentLayout,
            rowIndex,
            moduleIndex,
            side,
            currentDnas,
          }),
          TE.chain(({ alts, current }) =>
            pipe(
              alts,
              A.traverse(TE.ApplicativePar)(
                ({ dnas, layout, candidate, windowType }) =>
                  pipe(
                    createColumnLayoutGroup({
                      systemId,
                      dnas,
                      layout,
                    }),
                    TE.map((layoutGroup) => {
                      this.houseGroup.add(layoutGroup);

                      layoutGroup.updateBBs();

                      this.houseGroup.managers.cuts?.createObjectCuts(
                        layoutGroup
                      );
                      this.houseGroup.managers.cuts?.showAppropriateBrushes(
                        layoutGroup
                      );

                      hideObject(layoutGroup);

                      return {
                        candidate,
                        windowType,
                        layoutGroup,
                      };
                    })
                  )
              ),
              TE.map((altOpts): OpeningsChangeInfo => {
                const currentOpt: AltWindowTypeLayoutGroupOption = {
                  candidate: current.candidate,
                  layoutGroup: activeLayoutGroup,
                  windowType: current.windowType,
                };
                return {
                  allOpts: [...altOpts, currentOpt],
                  currentOpt,
                  altOpts,
                  side,
                  target,
                };
              })
            )
          )
        );
      })
    );
  }
}

export default OpeningsManager;
