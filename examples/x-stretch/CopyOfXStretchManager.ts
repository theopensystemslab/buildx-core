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
                    layoutGroup.name = `alt-${sectionType.code}-${layoutGroup.uuid}`;
                    this.houseGroup.add(layoutGroup);
                    layoutGroup.updateBBs();
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
    console.log("x-stretch init");
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

            console.log({
              alts,
              children: this.houseGroup.children.filter(
                (x) => x instanceof ColumnLayoutGroup
              ),
            });

            this.progressData = {
              cumulativeDx: 0,
              currentLayoutIndex,
            };
          })
        )
      )
    )();
  }

  cutAlts() {
    const cutKey =
      this.houseGroup.unsafeActiveLayoutGroup.userData.dnas.toString() +
      JSON.stringify(this.houseGroup.managers.cuts?.settings);

    if (this.cutKey === cutKey) return;

    this.cutKey = cutKey;

    console.log(`cutAlts ${cutKey}`);

    this.initData?.alts.forEach(({ layoutGroup }) => {
      this.houseGroup.managers.cuts?.createClippedBrushes(layoutGroup);
      this.houseGroup.managers.cuts?.showAppropriateBrushes(layoutGroup);
    });

    console.log(
      this.initData?.alts,
      this.houseGroup.children.filter((x) => x instanceof ColumnLayoutGroup)
    );
  }

  gestureStart(side: 1 | -1) {
    this.cutAlts();

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

    // Calculate new width by adding the new delta to our running total
    let newWidth =
      initialLayoutWidth + this.progressData.cumulativeDx + side * delta;

    // Ensure we stay within the allowed width range for this section type
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    // Calculate how much we actually moved (important for handle updates)
    const actualDelta =
      newWidth - (initialLayoutWidth + this.progressData.cumulativeDx);

    // Keep track of total movement since gesture start
    this.progressData.cumulativeDx += actualDelta;

    // Store current layout index before potential transition
    const previousLayoutIndex = this.progressData.currentLayoutIndex;

    // Check if we should transition to a different layout
    this.checkAndPerformLayoutTransition(newWidth);

    // Only move handles when layout actually changes
    if (previousLayoutIndex !== this.progressData.currentLayoutIndex) {
      const newLayoutWidth =
        this.initData.alts[this.progressData.currentLayoutIndex].sectionType
          .width;
      const currentLayoutWidth =
        this.initData.alts[previousLayoutIndex].sectionType.width;
      const widthDelta = newLayoutWidth - currentLayoutWidth;
      this.updateHandlePositions(widthDelta); // Remove the /2 here since updateHandlePositions already handles it
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
    const previousIndex = currentLayoutIndex;

    if (currentWidth > this.initData!.initialLayoutWidth) {
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

    if (currentLayoutIndex !== previousIndex) {
      this.transitionToLayout(alts[currentLayoutIndex], currentLayoutIndex);
    }
  }

  private transitionToLayout(
    nextLayout: AltSectionTypeLayout,
    nextIndex: number
  ) {
    if (this.houseGroup.managers.layouts) {
      this.houseGroup.managers.layouts.activeLayoutGroup =
        nextLayout.layoutGroup;
      this.progressData!.currentLayoutIndex = nextIndex;
    }
  }

  gestureEnd() {
    // If we have a preview layout, make it the active layout
    if (this.houseGroup.managers.layouts?.previewLayoutGroup._tag === "Some") {
      this.houseGroup.managers.layouts.activeLayoutGroup =
        this.houseGroup.managers.layouts.previewLayoutGroup.value;
    }

    // Clean up current state
    this.cleanup();

    // Re-initialize for next potential stretch
    this.init();

    console.log(`ZStretch init from XStretch gestureEnd`);
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
    // Remove all alt layouts except the active one
    if (this.initData) {
      const activeLayout = this.houseGroup.unsafeActiveLayoutGroup;
      this.initData.alts.forEach(({ layoutGroup }) => {
        if (layoutGroup !== activeLayout) {
          this.houseGroup.remove(layoutGroup);
        }
      });
    }

    // Reset all state data
    this.initData = undefined;
    this.startData = undefined;
    this.progressData = undefined;
    this.cutKey = null;
  }

  onHandleHover(): void {
    this.cutAlts();
  }
}

export default CopyOfXStretchManager;
