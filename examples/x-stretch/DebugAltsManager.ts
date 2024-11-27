import { HouseGroup, SectionType } from "@/index";
import StretchHandleGroup from "@/three/objects/handles/StretchHandleGroup";
import { hideObject, showObject } from "@/three/utils/layers";
import { A, E, O, S, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { AbstractXStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "@/three/objects/house/ColumnLayoutGroup";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { columnLayoutToDnas } from "@/layouts/init";

type AltSectionTypeLayout = {
  sectionType: SectionType;
  layoutGroup: ColumnLayoutGroup;
};

class DebugAltsManager extends AbstractXStretchManager {
  handles: [StretchHandleGroup, StretchHandleGroup];

  initData?: {
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
  };

  startData?: {
    side: 1 | -1;
  };

  alts: Array<AltSectionTypeLayout> = [];

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);
    this.handles = [
      new StretchHandleGroup({ axis: "x", side: -1, manager: this }),
      new StretchHandleGroup({ axis: "x", side: 1, manager: this }),
    ];
  }

  init() {
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        this.handles.forEach((x) => x.syncDimensions(activeLayoutGroup));

        const [handleLeft, handleRight] = this.handles;
        this.houseGroup.add(handleLeft);
        this.houseGroup.add(handleRight);

        // For now, just set some basic width constraints
        this.initData = {
          initialWidth: activeLayoutGroup.userData.width,
          minWidth: activeLayoutGroup.userData.width * 0.5,
          maxWidth: activeLayoutGroup.userData.width * 1.5,
        };
      })
    );
  }

  getCreateAltsTE(): TE.TaskEither<Error, Array<AltSectionTypeLayout>> {
    const { systemId } = this.houseGroup.userData;

    return pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const { layout, sectionType } = activeLayoutGroup.userData;

        return pipe(
          getAltSectionTypeLayouts({ systemId, layout, sectionType }),
          TE.chain(
            flow(
              A.takeLeft(1),
              A.traverseWithIndex(TE.ApplicativePar)(
                (i, { layout, sectionType }) =>
                  pipe(
                    createColumnLayoutGroup({
                      systemId,
                      dnas: columnLayoutToDnas(layout),
                      layout,
                    }),
                    TE.map((layoutGroup) => {
                      this.houseGroup.add(layoutGroup);
                      layoutGroup.position.z +=
                        i * layoutGroup.userData.depth +
                        this.houseGroup.unsafeActiveLayoutGroup.userData.depth;
                      layoutGroup.updateBBs();
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

  gestureStart(side: 1 | -1) {
    this.startData = { side };
    this.houseGroup.managers.zStretch?.hideHandles();
    this.getCreateAltsTE()().then((x) => {
      pipe(
        x,
        E.map((xs) => {
          this.alts = xs;
        })
      );
    });
  }

  gestureProgress(delta: number) {
    if (!this.initData || !this.startData) return;

    // Calculate potential new width
    const halfDelta = delta / 2;
    const [handleLeft, handleRight] = this.handles;

    // Move handles symmetrically
    handleLeft.position.x -= halfDelta;
    handleRight.position.x += halfDelta;
  }

  gestureEnd() {
    this.houseGroup.managers.zStretch?.showHandles();

    for (let { layoutGroup } of this.alts) {
      this.houseGroup.managers.cuts?.updateClippingBrush();
      this.houseGroup.managers.cuts?.createClippedBrushes(layoutGroup);
      this.houseGroup.managers.cuts?.showAppropriateBrushes(layoutGroup);
    }
  }

  showHandles() {
    this.handles.forEach(showObject);
  }

  hideHandles() {
    this.handles.forEach(hideObject);
  }

  cleanup(): void {}
}

export default DebugAltsManager;
