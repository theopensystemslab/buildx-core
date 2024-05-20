import { getSectionType } from "@/build-systems/cache";
import { LevelType } from "@/build-systems/remote/levelTypes";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { WindowType } from "@/build-systems/remote/windowTypes";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { getAltWindowTypeLayouts } from "@/layouts/changeWindowType";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { ScopeElement } from "../objects/types";
import { Side } from "../utils/camera";
import { columnLayoutToDnas } from "@/layouts/init";

class LayoutsManager {
  houseGroup: HouseGroup;
  houseTypeLayoutGroup: ColumnLayoutGroup;
  activeLayoutGroup: ColumnLayoutGroup;
  sectionTypeLayouts: Array<{
    sectionType: SectionType;
    layoutGroup: ColumnLayoutGroup;
  }>;
  changeLevelType?: {
    target: ScopeElement;
    options: Array<{
      layoutGroup: ColumnLayoutGroup;
      levelType: LevelType;
    }>;
  };
  changeWindowType?: {
    target: ScopeElement;
    options: Array<{
      layoutGroup: ColumnLayoutGroup;
      windowType: WindowType;
    }>;
  };

  constructor(initialLayoutGroup: ColumnLayoutGroup) {
    this.houseGroup = initialLayoutGroup.parent as HouseGroup;
    this.sectionTypeLayouts = [];
    this.houseTypeLayoutGroup = initialLayoutGroup;
    this.activeLayoutGroup = initialLayoutGroup;
  }

  // just to confirm swapping layouts actually works
  swapSomeLayout() {
    const nextLayout = this.sectionTypeLayouts[0].layoutGroup;
    nextLayout.visible = true;
    this.activeLayoutGroup.visible = false;
    this.activeLayoutGroup = nextLayout;
    this.houseGroup.cutsManager.createClippedBrushes();
    this.houseGroup.cutsManager.showClippedBrushes();
  }

  refreshAltSectionTypeLayouts() {
    // cleanup
    this.sectionTypeLayouts.forEach((x) => {
      x.layoutGroup.removeFromParent();
    });
    this.sectionTypeLayouts = [];

    const { systemId } = this.houseGroup.userData;
    const { layout, sectionType: code } = this.activeLayoutGroup.userData;

    const t = this;

    pipe(
      { systemId, code },
      getSectionType,
      TE.chain((sectionType) =>
        getAltSectionTypeLayouts({
          systemId,
          layout,
          sectionType,
        })
      ),
      TE.map((xs) => {
        return xs;
      }),
      TE.chain(
        A.traverse(TE.ApplicativeSeq)(({ layout, sectionType }) => {
          const dnas = columnLayoutToDnas(layout);

          return pipe(
            {
              systemId,
              dnas,
              layout,
            },
            createColumnLayoutGroup,
            TE.map((layoutGroup) => ({ layoutGroup, sectionType }))
          );
        })
      ),
      TE.map((xs) => {
        t.sectionTypeLayouts = xs;
        xs.forEach((x) => {
          x.layoutGroup.visible = false;
          t.houseGroup.add(x.layoutGroup);
        });
      })
    )();
  }

  refreshAltWindowTypeLayouts(
    { columnIndex, levelIndex, moduleIndex }: ScopeElement,
    side: Side
  ) {
    const { systemId } = this.houseGroup.userData;
    const { layout: currentLayout } = this.activeLayoutGroup.userData;

    pipe(
      getAltWindowTypeLayouts({
        systemId,
        columnIndex,
        currentLayout,
        levelIndex,
        moduleIndex,
        side,
      }),
      TE.map((xs) => {
        xs.forEach(({ candidate, dnas, layout, windowType }) => {
          console.log({ candidate, dnas, layout, windowType });
        });
      })
    )();

    console.log("ran");
  }
}

export default LayoutsManager;
