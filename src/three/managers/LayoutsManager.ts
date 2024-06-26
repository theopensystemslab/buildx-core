import { LevelType } from "@/build-systems/remote/levelTypes";
import { SectionType } from "@/build-systems/remote/sectionTypes";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import {
  AltWindowTypeLayoutGroupOption,
  getAltWindowTypeLayouts,
} from "@/layouts/changeWindowType";
import { columnLayoutToDnas } from "@/layouts/init";
import { A, O, S, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { ScopeElement } from "../objects/types";
import { Side } from "../utils/camera";
import { hideObject, showObject } from "../utils/layers";

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
  }

  get activeLayoutGroup(): ColumnLayoutGroup {
    return this._activeLayoutGroup;
  }

  set activeLayoutGroup(layoutGroup: ColumnLayoutGroup) {
    if (this._previewLayoutGroup === null) {
      hideObject(this._activeLayoutGroup);
      showObject(layoutGroup);
      this._activeLayoutGroup = layoutGroup;
    } else {
      if (this._previewLayoutGroup !== layoutGroup)
        throw new Error(
          `unexpected setting active layout group different than preivew`
        );
      this._activeLayoutGroup = this._previewLayoutGroup;
      this._previewLayoutGroup = null;
    }
  }

  get previewLayoutGroup(): ColumnLayoutGroup | null {
    return this._previewLayoutGroup;
  }

  set previewLayoutGroup(incoming: ColumnLayoutGroup | null) {
    if (this._activeLayoutGroup.visible) {
      if (incoming === null) {
        return;
      }
      // incoming is a thing
      hideObject(this._activeLayoutGroup);
      showObject(incoming);
      this._previewLayoutGroup = incoming;
      return;
    } else {
      // active invisible; preview showing hopefully
      if (
        this._previewLayoutGroup === null ||
        !this._previewLayoutGroup.visible
      ) {
        throw new Error(`unexpected state`);
      }

      if (incoming === null) {
        showObject(this._activeLayoutGroup);
        hideObject(this._previewLayoutGroup);
        this._previewLayoutGroup = null;
      } else {
        // new preview vs. old preview
        showObject(incoming);
        hideObject(this._previewLayoutGroup);
        this._previewLayoutGroup = incoming;
      }
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

  private clearPreviousLayouts() {
    this.sectionTypeLayouts.forEach((x) => {
      if (x.layoutGroup.uuid !== this._activeLayoutGroup.uuid) {
        x.layoutGroup.removeFromParent();
      }
    });
  }

  prepareAltSectionTypeLayouts() {
    const { systemId } = this.houseGroup.userData;
    const { layout, sectionType } = this.activeLayoutGroup.userData;

    this.clearPreviousLayouts();

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
                hideObject(layoutGroup);
                this.activeLayoutGroup.cutsManager.syncObjectCuts(layoutGroup);
                return { layoutGroup, sectionType };
              })
            )
          ),
          TE.map((xs) => {
            this.sectionTypeLayouts = [
              ...xs,
              {
                layoutGroup: this.activeLayoutGroup,
                sectionType: this.activeLayoutGroup.userData.sectionType,
              },
            ].sort((a, b) =>
              S.Ord.compare(b.sectionType.code, a.sectionType.code)
            );
            return this.sectionTypeLayouts;
          })
        )
      ),
      TE.getOrElse(() => [] as any)
    )();
  }

  cycleWindowTypeLayout() {
    pipe(
      this.changeWindowType,
      O.fromNullable,
      O.map(({ options }) => {
        if (options.length > 0) {
          options[0].layoutGroup.cutsManager.setClippingBrush(
            this.activeLayoutGroup.cutsManager.settings
          );
          this.activeLayoutGroup = options[0].layoutGroup;
        }
      })
    );
  }

  async prepareAltWindowTypeLayouts(target: ScopeElement, side: Side) {
    const houseGroup = this.houseGroup;
    const activeLayoutGroup = this.activeLayoutGroup;
    const {
      userData: { systemId },
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
                  hideObject(layoutGroup);

                  houseGroup.add(layoutGroup);

                  layoutGroup.updateOBB();

                  layoutGroup.cutsManager.setClippingBrush(
                    activeLayoutGroup.cutsManager.settings
                  );

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
