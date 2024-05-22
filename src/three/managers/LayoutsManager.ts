import { LevelType } from "@/build-systems/remote/levelTypes";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { WindowType } from "@/build-systems/remote/windowTypes";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { getAltWindowTypeLayouts } from "@/layouts/changeWindowType";
import { columnLayoutToDnas } from "@/layouts/init";
import { A, Num, O, Ord, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { ScopeElement } from "../objects/types";
import { Side } from "../utils/camera";

class LayoutsManager {
  houseGroup: HouseGroup;
  // this is the initial layout group, in case we want to reset
  houseTypeLayoutGroup: ColumnLayoutGroup;
  _activeLayoutGroup: ColumnLayoutGroup;
  sectionTypeLayouts?: Array<{
    sectionType: SectionType;
    layoutGroup: ColumnLayoutGroup;
  }>;
  // there are only alternative level type layouts sometimes
  changeLevelType?: {
    target: ScopeElement;
    options: Array<{
      layoutGroup: ColumnLayoutGroup;
      levelType: LevelType;
    }>;
  };
  // there are only alternative window type layouts sometimes
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
    this._activeLayoutGroup = initialLayoutGroup;
    this.init();
  }

  init() {
    this.prepareAltSectionTypeLayouts();
  }

  get activeLayoutGroup(): ColumnLayoutGroup {
    return this._activeLayoutGroup;
  }

  get currentSectionType(): SectionType {
    return this.activeLayoutGroup.userData.sectionType;
  }

  set activeLayoutGroup(layoutGroup: ColumnLayoutGroup) {
    this._activeLayoutGroup.visible = false;
    layoutGroup.visible = true;
    this._activeLayoutGroup = layoutGroup;

    // CUTS STUFF - ignore this for now
    // this.houseGroup.cutsManager.createClippedBrushes();
    // this.houseGroup.cutsManager.showClippedBrushes();
  }

  // this seems messy too
  cycleSectionTypeLayout() {
    const { currentSectionType, sectionTypeLayouts } = this;
    const t = this;

    pipe(
      sectionTypeLayouts,
      O.fromNullable,
      O.chain(
        A.findIndex((x) => x.sectionType.code === currentSectionType.code)
      ),
      O.map((currentIndex) => {
        const nextIndex =
          currentIndex === sectionTypeLayouts!.length - 1
            ? 0
            : currentIndex + 1;

        pipe(
          sectionTypeLayouts!,
          A.lookup(nextIndex),
          O.map((nextLayout) => {
            t.activeLayoutGroup = nextLayout.layoutGroup;
          })
        );
      })
    );
  }

  // this seems quite messy
  prepareAltSectionTypeLayouts() {
    const activeLayoutGroup = this.activeLayoutGroup;

    this.sectionTypeLayouts?.forEach((x) => {
      if (x.layoutGroup.uuid === activeLayoutGroup.uuid) return;
      x.layoutGroup.removeFromParent();
    });

    this.sectionTypeLayouts = [
      {
        layoutGroup: activeLayoutGroup,
        sectionType: activeLayoutGroup.userData.sectionType,
      },
    ];

    const { systemId } = this.houseGroup.userData;

    const t = this;

    const {
      activeLayoutGroup: {
        userData: { layout, sectionType },
      },
    } = t;

    pipe(
      getAltSectionTypeLayouts({
        systemId,
        layout,
        sectionType,
      }),
      TE.chain(
        A.traverse(TE.ApplicativePar)(({ layout, sectionType }) => {
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
        const bySectionType = Ord.contramap(
          (x: (typeof xs)[0]) => x.sectionType.width
        );

        const ys = pipe(
          [...xs, ...t.sectionTypeLayouts!],
          A.sort(pipe(Num.Ord, bySectionType))
        );

        t.sectionTypeLayouts = ys;

        xs.forEach((x) => {
          x.layoutGroup.visible = false;
          t.houseGroup.add(x.layoutGroup);
        });
      })
    )();
  }

  // Ignore this for now
  refreshAltWindowTypeLayouts(target: ScopeElement, side: Side) {
    const { systemId } = this.houseGroup.userData;
    const { layout: currentLayout } = this.activeLayoutGroup.userData;
    const { columnIndex, rowIndex, moduleIndex } = target;

    const t = this;

    pipe(
      getAltWindowTypeLayouts({
        systemId,
        columnIndex,
        currentLayout,
        rowIndex,
        moduleIndex,
        side,
      }),
      TE.chain(
        A.traverse(TE.ApplicativePar)(
          ({ dnas, layout, candidate, windowType }) =>
            pipe(
              createColumnLayoutGroup({
                systemId,
                dnas,
                layout,
              }),
              TE.map((layoutGroup) => ({
                candidate,
                windowType,
                layoutGroup,
              }))
            )
        )
      ),
      TE.map((options) => {
        t.changeWindowType = {
          options,
          target,
        };
      })
    )();
  }
}

export default LayoutsManager;
