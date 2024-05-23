import { LevelType } from "@/build-systems/remote/levelTypes";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { WindowType } from "@/build-systems/remote/windowTypes";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { columnLayoutToDnas } from "@/layouts/init";
import { A, O, S, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { ScopeElement } from "../objects/types";
import { getAltWindowTypeLayouts } from "@/layouts/changeWindowType";
import { Side } from "../utils/camera";

class LayoutsManager {
  houseGroup: HouseGroup;
  houseTypeLayoutGroup: ColumnLayoutGroup;
  private _activeLayoutGroup: ColumnLayoutGroup;
  sectionTypeLayouts: Array<{
    sectionType: SectionType;
    layoutGroup: ColumnLayoutGroup;
  }> = [];
  changeLevelType?: {
    target: ScopeElement;
    options: Array<{ layoutGroup: ColumnLayoutGroup; levelType: LevelType }>;
  };
  changeWindowType?: {
    target: ScopeElement;
    options: Array<{ layoutGroup: ColumnLayoutGroup; windowType: WindowType }>;
  };

  constructor(initialLayoutGroup: ColumnLayoutGroup) {
    this.houseGroup = initialLayoutGroup.parent as HouseGroup;
    this.houseTypeLayoutGroup = initialLayoutGroup;
    this._activeLayoutGroup = initialLayoutGroup;
    this.init();
  }

  private init() {
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
    this._activeLayoutGroup.updateOBB();
  }

  cycleSectionTypeLayout() {
    const { currentSectionType, sectionTypeLayouts } = this;

    pipe(
      sectionTypeLayouts,
      O.fromNullable,
      O.chain(
        A.findIndex((x) => x.sectionType.code === currentSectionType.code)
      ),
      O.fold(
        () => console.warn("Current section type layout not found"),
        (currentIndex) => {
          const nextIndex = (currentIndex + 1) % sectionTypeLayouts.length;
          this.activeLayoutGroup = sectionTypeLayouts[nextIndex].layoutGroup;
        }
      )
    );
  }

  private async prepareAltSectionTypeLayouts() {
    const { systemId } = this.houseGroup.userData;
    const { layout, sectionType } = this.activeLayoutGroup.userData;

    this.clearPreviousLayouts();

    const layouts = await pipe(
      getAltSectionTypeLayouts({ systemId, layout, sectionType }),
      TE.chain(
        A.traverse(TE.ApplicativePar)(({ layout, sectionType }) =>
          pipe(
            createColumnLayoutGroup({
              systemId,
              dnas: columnLayoutToDnas(layout),
              layout,
            }),
            TE.map((layoutGroup) => ({ layoutGroup, sectionType }))
          )
        )
      ),
      TE.getOrElse(() => [] as any)
    )();

    this.updateSectionTypeLayouts(layouts);
  }

  private clearPreviousLayouts() {
    this.sectionTypeLayouts.forEach((x) => {
      if (x.layoutGroup.uuid !== this._activeLayoutGroup.uuid) {
        x.layoutGroup.removeFromParent();
      }
    });
  }

  private updateSectionTypeLayouts(
    newLayouts: Array<{
      layoutGroup: ColumnLayoutGroup;
      sectionType: SectionType;
    }>
  ) {
    this.sectionTypeLayouts = [
      {
        layoutGroup: this._activeLayoutGroup,
        sectionType: this.currentSectionType,
      },
      ...newLayouts,
    ].sort((a, b) => S.Ord.compare(a.sectionType.code, b.sectionType.code));

    newLayouts.forEach(({ layoutGroup }) => {
      layoutGroup.visible = false;
      this.houseGroup.add(layoutGroup);
    });
  }

  cycleWindowTypeLayout() {
    const t = this;

    pipe(
      this.changeWindowType,
      O.fromNullable,
      O.map(({ options }) => {
        if (options.length > 0) {
          t.activeLayoutGroup = options[0].layoutGroup;
          console.log(t.activeLayoutGroup.scene);
        }
      })
    );
  }

  async prepareAltWindowTypeLayouts(target: ScopeElement, side: Side) {
    const { systemId } = this.houseGroup.userData;
    const { layout: currentLayout } = this.activeLayoutGroup.userData;
    const { columnIndex, rowIndex, moduleIndex } = target;

    const options = await pipe(
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
              TE.map((layoutGroup) => {
                layoutGroup.visible = false;
                this.houseGroup.add(layoutGroup);

                return {
                  candidate,
                  windowType,
                  layoutGroup,
                };
              })
            )
        )
      ),
      TE.getOrElse(() => [] as any)
    )();

    this.changeWindowType = { options, target };
  }
}

export default LayoutsManager;
