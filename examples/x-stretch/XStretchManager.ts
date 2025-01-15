import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { columnLayoutToDnas } from "@/layouts/init";
import { A, O, S, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "@/three/objects/house/ColumnLayoutGroup";
import { HouseGroup } from "@/three/objects/house/HouseGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { SectionType } from "@/data/build-systems";
import { AbstractXStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";

type AltSectionTypeLayout = {
  sectionType: SectionType;
  layoutGroup: ColumnLayoutGroup;
};

class XStretchManager extends AbstractXStretchManager {
  private static readonly ALT_LAYOUT_PREFIX = "X_STRETCH_ALT";
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
  cutKey: string | null = null;

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);

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
                    layoutGroup.name = `${XStretchManager.ALT_LAYOUT_PREFIX}-${sectionType.code}-${layoutGroup.uuid}`;
                    this.houseGroup.add(layoutGroup);
                    layoutGroup.updateBBs();
                    hideObject(layoutGroup);
                    return { layoutGroup, sectionType };
                  })
                )
              ),
              TE.map((xs) => {
                const sorted = [
                  ...xs,
                  {
                    layoutGroup: activeLayoutGroup,
                    sectionType: activeLayoutGroup.userData.sectionType,
                  },
                ].sort((a, b) =>
                  S.Ord.compare(b.sectionType.code, a.sectionType.code)
                );
                return sorted;
              })
            )
          )
        );
      }),
      TE.fromOption(() => new Error("No active layout group found")),
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

            // Remove this line since handles are already shown
            // this.showHandles();
          })
        )
      )
    )();
  }

  private generateCutKey(): string | null {
    if (!this.initData || !this.houseGroup.managers.cuts) return null;

    // Include both the DNAs and the cuts settings in the key
    return [
      // Layout DNAs
      this.initData.alts
        .map((alt) => alt.layoutGroup.userData.dnas.toString())
        .join("|"),
      // Cuts settings
      JSON.stringify(this.houseGroup.managers.cuts.settings),
    ].join("::");
  }

  private performCuts() {
    if (!this.initData) {
      return;
    }

    const newCutKey = this.generateCutKey();

    if (this.cutKey === newCutKey) {
      return;
    }

    this.cutKey = newCutKey;

    this.initData.alts.forEach(({ layoutGroup }) => {
      if (!this.houseGroup.managers.cuts) {
        throw new Error("Cuts manager not available");
      }
      this.houseGroup.managers.cuts.createClippedBrushes(layoutGroup);
      this.houseGroup.managers.cuts.showAppropriateBrushes(layoutGroup);
    });
  }

  gestureStart(side: 1 | -1) {
    this.performCuts();

    this.startData = {
      side,
    };

    this.houseGroup.managers.zStretch?.hideHandles();
  }

  /**
   * Handles the progress of an X-axis stretch gesture
   * @param delta The incremental change in X position since the last progress event.
   *             This is NOT the total offset from gesture start, but rather the
   *             change since the last dragProgress event.
   */
  gestureProgress(delta: number) {
    if (!this.initData || !this.startData || !this.progressData) {
      console.error("Gesture progress called before initialization");
      return;
    }

    const { initialLayoutWidth, minWidth, maxWidth } = this.initData;
    const { side } = this.startData;

    // Calculate target width directly from cumulative delta
    const targetWidth =
      initialLayoutWidth + this.progressData.cumulativeDx + side * delta;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, targetWidth));

    // Update cumulative delta
    this.progressData.cumulativeDx = newWidth - initialLayoutWidth;

    // Check for layout transitions using the new comparison logic
    const previousLayoutIndex = this.progressData.currentLayoutIndex;
    this.checkAndPerformLayoutTransition(newWidth);

    // Update handle positions if layout changed
    if (previousLayoutIndex !== this.progressData.currentLayoutIndex) {
      const newLayoutWidth =
        this.initData.alts[this.progressData.currentLayoutIndex].sectionType
          .width;
      const currentLayoutWidth =
        this.initData.alts[previousLayoutIndex].sectionType.width;
      const widthDelta = newLayoutWidth - currentLayoutWidth;
      this.updateHandlePositions(widthDelta);
    }
  }

  private updateHandlePositions(delta: number) {
    const [handleDown, handleUp] = this.handles;

    // Move both handles symmetrically
    const halfDelta = delta / 2;
    handleDown.position.x -= halfDelta;
    handleUp.position.x += halfDelta;
  }

  private checkAndPerformLayoutTransition(currentWidth: number) {
    const { alts } = this.initData!;
    let { currentLayoutIndex } = this.progressData!;
    const previousWidth = alts[currentLayoutIndex].sectionType.width;

    if (currentWidth > previousWidth) {
      while (
        currentLayoutIndex < alts.length - 1 &&
        currentWidth >= alts[currentLayoutIndex + 1].sectionType.width
      ) {
        currentLayoutIndex++;
      }
    } else {
      while (
        currentLayoutIndex > 0 &&
        currentWidth <= alts[currentLayoutIndex - 1].sectionType.width
      ) {
        currentLayoutIndex--;
      }
    }

    if (currentLayoutIndex !== this.progressData!.currentLayoutIndex) {
      this.transitionToLayout(alts[currentLayoutIndex], currentLayoutIndex);
    }
  }

  private transitionToLayout(
    nextLayout: AltSectionTypeLayout,
    nextIndex: number
  ) {
    if (this.houseGroup.managers.layouts) {
      // Set as preview during the stretch operation
      this.houseGroup.managers.layouts.previewLayoutGroup = O.some(
        nextLayout.layoutGroup
      );
      this.progressData!.currentLayoutIndex = nextIndex;
    }
  }

  gestureEnd() {
    // If there's no preview layout, nothing needs to be done
    if (O.isNone(this.houseGroup.managers.layouts?.previewLayoutGroup)) {
      return;
    }

    this.houseGroup.managers.layouts.activeLayoutGroup =
      this.houseGroup.managers.layouts.previewLayoutGroup.value;

    this.cleanup();
    this.init();

    this.houseGroup.managers.zStretch?.init();
    this.houseGroup.managers.zStretch?.showHandles();
  }

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  cleanup(): void {
    // Remove our alt layouts and any preview layouts created during stretch
    const activeLayout = this.houseGroup.unsafeActiveLayoutGroup;
    this.houseGroup.children
      .filter(
        (child) =>
          child instanceof ColumnLayoutGroup &&
          child !== activeLayout &&
          (child.name.startsWith(XStretchManager.ALT_LAYOUT_PREFIX) ||
            child.name.startsWith("PREVIEW_LAYOUT"))
      )
      .forEach((layout) => {
        this.houseGroup.remove(layout);
      });

    // Reset all state data
    this.initData = undefined;
    this.startData = undefined;
    this.progressData = undefined;
    this.cutKey = null;

    // Clear any remaining preview in layouts manager
    if (this.houseGroup.managers.layouts) {
      this.houseGroup.managers.layouts.previewLayoutGroup = O.none;
    }
  }

  // somehow this doesn't actually help
  // the intention was to optimize the performance of the cuts
  onHandleHover(): void {
    // Only proceed if we have initData
    if (!this.initData) {
      return;
    }

    // this.performCuts();
  }
}

export default XStretchManager;