import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { columnLayoutToDnas } from "@/layouts/init";
import { A, O, S, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import StretchHandleGroup from "../objects/handles/StretchHandleGroup";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { hideObject, showObject } from "../utils/layers";
import StretchManager from "./StretchManager";
import { SectionType } from "@/data/build-systems";

type AltSectionTypeLayout = {
  sectionType: SectionType;
  layoutGroup: ColumnLayoutGroup;
};

class XStretchManager implements StretchManager {
  houseGroup: HouseGroup;
  handles: [StretchHandleGroup, StretchHandleGroup];
  initData?: {
    alts: Array<AltSectionTypeLayout>;
    minWidth: number;
    maxWidth: number;
    initialLayoutWidth: number;
  };
  startData?: {
    side: 1 | -1;
  };
  progressData?: {
    cumulativeDx: number;
    currentLayoutIndex: number;
  };

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;

    this.handles = [
      new StretchHandleGroup({
        axis: "x",
        side: -1,
        manager: this,
      }),
      new StretchHandleGroup({
        axis: "x",
        side: 1,
        manager: this,
      }),
    ];
  }

  createAlts(): TE.TaskEither<Error, Array<AltSectionTypeLayout>> {
    const { systemId } = this.houseGroup.userData;

    return pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const { layout, sectionType } = activeLayoutGroup.userData;

        return pipe(
          getAltSectionTypeLayouts({ systemId, layout, sectionType }),
          TE.chain(
            flow(
              A.traverse(TE.ApplicativePar)(({ layout, sectionType }) =>
                pipe(
                  createColumnLayoutGroup({
                    systemId,
                    dnas: columnLayoutToDnas(layout),
                    layout,
                  }),
                  TE.map((layoutGroup) => {
                    this.houseGroup.add(layoutGroup);
                    layoutGroup.updateOBB();
                    this.houseGroup.managers.cuts?.createObjectCuts(
                      layoutGroup
                    );
                    this.houseGroup.managers.cuts?.showAppropriateBrushes(
                      layoutGroup
                    );
                    hideObject(layoutGroup);
                    return { layoutGroup, sectionType };
                  })
                )
              ),
              TE.map((xs) => {
                return [
                  ...xs,
                  {
                    layoutGroup: activeLayoutGroup,
                    sectionType: activeLayoutGroup.userData.sectionType,
                  },
                ].sort((a, b) =>
                  S.Ord.compare(b.sectionType.code, a.sectionType.code)
                );
              })
            )
          )
        );
      }),
      TE.fromOption(() => Error(`eh`)),
      TE.flatten
    );
  }

  init() {
    return pipe(
      this.houseGroup.activeLayoutGroup,
      TE.fromOption(() => Error(`no activeLayoutGroup`)),
      TE.map((activeLayoutGroup) => {
        this.handles.forEach((x) => x.syncDimensions(activeLayoutGroup));

        const [handleDown, handleUp] = this.handles;
        this.houseGroup.add(handleDown);
        this.houseGroup.add(handleUp);

        return activeLayoutGroup;
      }),
      TE.chain((activeLayoutGroup) =>
        pipe(
          this.createAlts(),
          TE.map((alts) => {
            const currentLayoutIndex = alts.findIndex(
              (x) => x.layoutGroup === activeLayoutGroup
            );
            if (currentLayoutIndex === -1)
              throw new Error(`currentLayoutIndex === -1`);

            this.initData = {
              alts,
              minWidth: alts[0].sectionType.width,
              maxWidth: alts[alts.length - 1].sectionType.width,
              initialLayoutWidth: activeLayoutGroup.userData.width,
            };

            this.progressData = {
              cumulativeDx: 0,
              currentLayoutIndex,
            };
          })
        )
      )
    )();
  }

  gestureStart(side: 1 | -1) {
    this.startData = {
      side,
    };
    this.houseGroup.managers.zStretch?.hideHandles();
  }

  gestureProgress(delta: number) {
    const {
      initialLayoutWidth: currentWidth,
      alts,
      // maxWidth,
      // minWidth,
    } = this.initData!;
    const { side } = this.startData!;

    this.progressData!.cumulativeDx += delta;

    const { cumulativeDx, currentLayoutIndex } = this.progressData!;

    // up the axis
    if (side === 1) {
      const v = currentWidth + cumulativeDx;

      // additive up the axis
      if (delta > 0) {
        pipe(
          alts,
          A.lookup(currentLayoutIndex + 1),
          O.map((nextWiderLayout) => {
            const targetWidth = nextWiderLayout.sectionType.width;

            // TODO make nicer?
            if (v >= targetWidth && this.houseGroup.managers.layouts) {
              this.houseGroup.managers.cuts?.showAppropriateBrushes(
                nextWiderLayout.layoutGroup
              );
              this.houseGroup.managers.layouts.activeLayoutGroup =
                nextWiderLayout.layoutGroup;
              this.progressData!.currentLayoutIndex++;
            }
          })
        );
      }

      // subtractive down the axis
      if (delta < 0) {
        pipe(
          alts,
          A.lookup(currentLayoutIndex - 1),
          O.map((nextShorterLayout) => {
            const targetWidth = nextShorterLayout.sectionType.width;

            // TODO make nicer? DRY?
            if (v <= targetWidth && this.houseGroup.managers.layouts) {
              this.houseGroup.managers.cuts?.showAppropriateBrushes(
                nextShorterLayout.layoutGroup
              );
              this.houseGroup.managers.layouts.activeLayoutGroup =
                nextShorterLayout.layoutGroup;
              this.progressData!.currentLayoutIndex--;
            }
          })
        );
      }
    }

    // down the axis
    if (side === -1) {
      const v = currentWidth - cumulativeDx;

      // additive down the axis
      if (delta < 0) {
        pipe(
          alts,
          A.lookup(currentLayoutIndex + 1),
          O.map((nextWiderLayout) => {
            const targetWidth = nextWiderLayout.sectionType.width;

            // TODO make nicer?
            if (v >= targetWidth && this.houseGroup.managers.layouts) {
              this.houseGroup.managers.cuts?.showAppropriateBrushes(
                nextWiderLayout.layoutGroup
              );
              this.houseGroup.managers.layouts.activeLayoutGroup =
                nextWiderLayout.layoutGroup;
              this.progressData!.currentLayoutIndex++;
            }
          })
        );
      }

      // subtractive up the axis
      if (delta > 0) {
        pipe(
          alts,
          A.lookup(currentLayoutIndex - 1),
          O.map((nextShorterLayout) => {
            const targetWidth = nextShorterLayout.sectionType.width;

            // TODO make nicer? DRY?
            if (v <= targetWidth && this.houseGroup.managers.layouts) {
              this.houseGroup.managers.cuts?.showAppropriateBrushes(
                nextShorterLayout.layoutGroup
              );
              this.houseGroup.managers.layouts.activeLayoutGroup =
                nextShorterLayout.layoutGroup;
              this.progressData!.currentLayoutIndex--;
            }
          })
        );
      }
    }

    // this.progressData!.currentWidth = ;

    const [handleDown, handleUp] = this.handles;

    handleDown.position.x -= side * delta;
    handleUp.position.x += side * delta;
  }

  gestureEnd() {
    this.houseGroup.managers.zStretch?.init();
    this.houseGroup.managers.zStretch?.showHandles();
  }

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }
}

export default XStretchManager;
