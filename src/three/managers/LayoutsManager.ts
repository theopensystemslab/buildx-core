import { getSectionType } from "@/build-systems/cache";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { columnLayoutToDnas } from "@/layouts/ops";
import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";

export type AltSectionTypeLayout = {
  columnLayoutGroup: ColumnLayoutGroup;
  sectionType: SectionType;
};

class LayoutsManager {
  houseGroup: HouseGroup;
  altSectionTypeLayouts: AltSectionTypeLayout[];
  activeLayoutGroup: ColumnLayoutGroup;
  previewLayoutGroup: ColumnLayoutGroup | null;

  constructor(activeLayoutGroup: ColumnLayoutGroup) {
    this.houseGroup = activeLayoutGroup.parent as HouseGroup;
    this.altSectionTypeLayouts = [];
    this.activeLayoutGroup = activeLayoutGroup;
    this.previewLayoutGroup = null;
  }

  foo() {
    // cleanup
    this.altSectionTypeLayouts.forEach((x) => {
      x.columnLayoutGroup.removeFromParent();
    });
    this.altSectionTypeLayouts = [];

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
            TE.map((columnLayoutGroup) => ({ columnLayoutGroup, sectionType }))
          );
        })
      ),
      TE.map((xs) => {
        t.altSectionTypeLayouts = xs;
      })
    )();
  }

  // refreshAltSectionTypeLayouts = async () => {
  //   // drop old ones
  //   dropAltLayoutsByType(LayoutType.Enum.ALT_SECTION_TYPE);

  //   const { dnas, sectionType: currentSectionType } =
  //     getActiveHouseUserData(houseTransformsGroup);

  //   // compute some new ones in the worker
  //   const altSectionTypeLayouts =
  //     await getLayoutsWorker().getAltSectionTypeLayouts({
  //       systemId,  sectionType: Section
  //       dnas,
  //       currentSectionType,
  //     });

  //   // create renderable layout group objects
  //   for (let { sectionType, layout, dnas } of altSectionTypeLayouts) {
  //     if (sectionType.code === currentSectionType) continue;

  //     createHouseLayoutGroup({
  //       systemId: houseTransformsGroup.userData.systemId,
  //       dnas,
  //       houseId,
  //       houseLayout: layout,
  //       houseTransformsGroup,
  //     })().then((houseLayoutGroup) => {
  //       houseTransformsGroup.userData.pushAltLayout({
  //         type: LayoutType.Enum.ALT_SECTION_TYPE,
  //         houseLayoutGroup,
  //         sectionType,
  //       });
  //     });
  //   }
  // };
}

export default LayoutsManager;
