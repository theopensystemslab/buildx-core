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

class CopyOfXStretchManager extends AbstractXStretchManager {
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
  private rawCumulativeDx: number = 0;

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
                    layoutGroup.name = `${CopyOfXStretchManager.ALT_LAYOUT_PREFIX}-${sectionType.code}-${layoutGroup.uuid}`;
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
      console.warn("Skipping cuts - no init data available");
      return;
    }

    const newCutKey = this.generateCutKey();

    // Skip if we've already cut these layouts
    if (this.cutKey === newCutKey) {
      console.log("Skipping cuts - layouts already cut");
      return;
    }

    console.time("performCuts");
    this.cutKey = newCutKey;

    this.initData.alts.forEach(({ layoutGroup }, index) => {
      try {
        if (!this.houseGroup.managers.cuts) {
          throw new Error("Cuts manager not available");
        }
        console.time(`cut layout ${index}`);
        this.houseGroup.managers.cuts.createClippedBrushes(layoutGroup);
        this.houseGroup.managers.cuts.showAppropriateBrushes(layoutGroup);
        console.timeEnd(`cut layout ${index}`);
      } catch (error) {
        console.error("Failed to cut layout:", layoutGroup.name, error);
      }
    });
    console.timeEnd("performCuts");
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

    // Track raw movement without clamping
    this.rawCumulativeDx += side * delta;

    console.log("Detailed Gesture Debug:", {
      delta,
      side,
      initialLayoutWidth,
      rawCumulativeDx: this.rawCumulativeDx,
      targetWidth: initialLayoutWidth + this.rawCumulativeDx,
      clampedWidth: Math.max(
        minWidth,
        Math.min(maxWidth, initialLayoutWidth + this.rawCumulativeDx)
      ),
      minWidth,
      maxWidth,
      currentLayoutIndex: this.progressData.currentLayoutIndex,
    });

    // Calculate target width using raw movement
    const targetWidth = initialLayoutWidth + this.rawCumulativeDx;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, targetWidth));

    // Store clamped difference for display purposes only
    this.progressData.cumulativeDx = newWidth - initialLayoutWidth;

    // 5. Handle layout transitions
    const previousLayoutIndex = this.progressData.currentLayoutIndex;
    this.checkAndPerformLayoutTransition(newWidth);

    // 6. Update handle positions if layout changed
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

    // Compare with previous width instead of initial width
    if (currentWidth > previousWidth) {
      // Stretching outwards
      while (
        currentLayoutIndex < alts.length - 1 &&
        currentWidth >= alts[currentLayoutIndex + 1].sectionType.width
      ) {
        currentLayoutIndex++;
      }
    } else {
      // Stretching inwards
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

    console.log({
      currentWidth,
      currentLayoutIndex: this.progressData!.currentLayoutIndex,
      availableLayouts: this.initData!.alts.map((a) => a.sectionType.width),
    });
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
    // Now we commit the preview to active (this is already correct in the code)
    if (this.houseGroup.managers.layouts?.previewLayoutGroup._tag === "Some") {
      this.houseGroup.managers.layouts.activeLayoutGroup =
        this.houseGroup.managers.layouts.previewLayoutGroup.value;
    }

    // Clean up current state
    this.cleanup();

    // Re-initialize for next potential stretch
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
    // Keep showing handles - only hide them when explicitly requested
    // this.hideHandles();

    // Remove our alt layouts and any preview layouts created during stretch
    const activeLayout = this.houseGroup.unsafeActiveLayoutGroup;
    this.houseGroup.children
      .filter(
        (child) =>
          child instanceof ColumnLayoutGroup &&
          child !== activeLayout &&
          (child.name.startsWith(CopyOfXStretchManager.ALT_LAYOUT_PREFIX) ||
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

    // Reset raw tracking in cleanup
    this.rawCumulativeDx = 0;
  }

  onHandleHover(): void {
    // Only proceed if we have initData
    if (!this.initData) {
      return;
    }

    if (!this.cutKey || this.cutKey !== this.generateCutKey()) {
      this.performCuts();
    }
  }

  // @ts-ignore
  private logColumnLayouts(context: string) {
    const columnLayouts = this.houseGroup.children.filter(
      (child) => child instanceof ColumnLayoutGroup
    );

    console.log(`[${context}] ColumnLayoutGroups:`, {
      total: columnLayouts.length,
      names: columnLayouts.map((c) => c.name),
      tracked: this.initData?.alts?.length ?? 0,
    });
  }
}

export default CopyOfXStretchManager;
