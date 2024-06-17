import { LevelType } from "@/build-systems/remote/levelTypes";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import {
  AltWindowTypeLayoutGroupOption,
  getAltWindowTypeLayouts,
} from "@/layouts/changeWindowType";
import { columnLayoutToDnas } from "@/layouts/init";
import { A, O, S, TE } from "@/utils/functions";
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
  houseTypeLayoutGroup: ColumnLayoutGroup;
  private _activeLayoutGroup: ColumnLayoutGroup;
  private _previewLayoutGroup: ColumnLayoutGroup | null;
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
    side: Side;
    options: Array<AltWindowTypeLayoutGroupOption>;
    current: AltWindowTypeLayoutGroupOption;
  };

  constructor(initialLayoutGroup: ColumnLayoutGroup) {
    this.houseGroup = initialLayoutGroup.parent as HouseGroup;
    this.houseTypeLayoutGroup = initialLayoutGroup.clone();
    this._activeLayoutGroup = initialLayoutGroup;
    this._previewLayoutGroup = null;
    this.init();
  }

  private init() {
    this.prepareAltSectionTypeLayouts();
  }

  get activeLayoutGroup(): ColumnLayoutGroup {
    return this._activeLayoutGroup;
  }

  set activeLayoutGroup(layoutGroup: ColumnLayoutGroup) {
    this._activeLayoutGroup.visible = false;
    layoutGroup.visible = true;
    this._activeLayoutGroup = layoutGroup;
  }

  get previewLayoutGroup(): ColumnLayoutGroup | null {
    return this._previewLayoutGroup;
  }

  set previewLayoutGroup(input: ColumnLayoutGroup | null) {
    if (input === null) {
      if (this._previewLayoutGroup !== null) {
        this._previewLayoutGroup.visible = false;
      }
      this._activeLayoutGroup.visible = true;
    } else {
      this._activeLayoutGroup.visible = false;
      input.visible = true;
    }
  }

  get currentSectionType(): SectionType {
    return this.activeLayoutGroup.userData.sectionType;
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
    const { cutsManager } = this.houseGroup;

    pipe(
      this.changeWindowType,
      O.fromNullable,
      O.map(({ options }) => {
        if (options.length > 0) {
          cutsManager.setClippingBrush(cutsManager.settings);
          t.activeLayoutGroup = options[0].layoutGroup;
        }
      })
    );
  }

  async prepareAltWindowTypeLayouts(target: ScopeElement, side: Side) {
    const houseGroup = this.houseGroup;
    const activeLayoutGroup = this.activeLayoutGroup;
    const {
      userData: { systemId },
      cutsManager,
    } = houseGroup;
    const { layout: currentLayout, dnas: currentDnas } =
      activeLayoutGroup.userData;
    const { columnIndex, rowIndex, moduleIndex } = target;

    const { options, current } = await pipe(
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
                  layoutGroup.visible = false;

                  houseGroup.add(layoutGroup);

                  layoutGroup.updateOBB();

                  cutsManager.setClippingBrush(cutsManager.settings);

                  return {
                    candidate,
                    windowType,
                    layoutGroup,
                  };
                })
              )
          ),
          TE.map((options) => ({ options, current }))
        )
      ),
      TE.getOrElse(() => [] as any)
    )();

    this.changeWindowType = {
      side,
      options,
      target,
      current: {
        layoutGroup: activeLayoutGroup,
        windowType: current.windowType,
      },
    };

    return this.changeWindowType;
  }
}

export default LayoutsManager;
