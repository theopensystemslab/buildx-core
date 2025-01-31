import { HouseGroup, SectionType } from "@/index";
import StretchHandleMesh, {
  DEFAULT_HANDLE_SIZE,
} from "@/three/objects/handles/StretchHandleMesh";
import { hideObject, showObject } from "@/three/utils/layers";
import { A, O, S, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { AbstractXStretchManager } from "@/three/managers/stretch/AbstractStretchManagers";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "@/three/objects/house/ColumnLayoutGroup";
import { getAltSectionTypeLayouts } from "@/layouts/changeSectionType";
import { columnLayoutToDnas } from "@/layouts/init";
import { createHandleMaterial } from "@/three/objects/handles/handleMaterial";
import { MeshStandardMaterial } from "three";

type AltSectionTypeLayout = {
  sectionType: SectionType;
  layoutGroup: ColumnLayoutGroup;
};

class DebugAltsManager extends AbstractXStretchManager {
  private handleMaterial: MeshStandardMaterial;
  handles?: [StretchHandleMesh, StretchHandleMesh];

  initData?: {
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
  };

  startData?: {
    side: 1 | -1;
  };

  constructor(houseGroup: HouseGroup) {
    super(houseGroup);
    this.handleMaterial = createHandleMaterial();
  }

  clearHandles() {
    this.handles?.forEach((handle) => {
      handle.removeFromParent();
    });
    this.handles = undefined;
  }

  createHandles() {
    const activeLayoutGroup = this.houseGroup.unsafeActiveLayoutGroup;
    const { width, depth } = activeLayoutGroup.userData;

    const handle0 = new StretchHandleMesh({
      depth,
      manager: this,
      material: this.handleMaterial,
      axis: "x",
      side: -1,
    });
    handle0.position.x = -width / 2 - DEFAULT_HANDLE_SIZE;

    const handle1 = new StretchHandleMesh({
      depth,
      manager: this,
      material: this.handleMaterial,
      axis: "x",
      side: 1,
    });
    handle1.position.x = width / 2 + DEFAULT_HANDLE_SIZE;

    this.handles = [handle0, handle1];
    this.houseGroup.add(handle0);
    this.houseGroup.add(handle1);
  }

  init() {
    this.cleanup();

    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        this.createHandles();

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

    console.log("get create alts te");

    return pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const { layout, sectionType } = activeLayoutGroup.userData;

        return pipe(
          getAltSectionTypeLayouts({ systemId, layout, sectionType }),
          TE.chain(
            flow(
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
                      this.houseGroup.managers.cuts?.createClippedBrushes(
                        layoutGroup
                      );
                      this.houseGroup.managers.cuts?.showAppropriateBrushes(
                        layoutGroup
                      );
                      console.log(`call ${i}`);
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
    this.getCreateAltsTE()();
  }

  gestureProgress(delta: number) {
    if (!this.initData || !this.startData) return;

    if (this.handles?.length !== 2) return;

    // Calculate potential new width
    const halfDelta = delta / 2;
    const [handleLeft, handleRight] = this.handles;

    // Move handles symmetrically
    handleLeft.position.x -= halfDelta;
    handleRight.position.x += halfDelta;
  }

  gestureEnd() {
    this.houseGroup.managers.zStretch?.showHandles();
  }

  showHandles() {
    this.handles?.forEach(showObject);
  }

  hideHandles() {
    this.handles?.forEach(hideObject);
  }

  cleanup(): void {
    this.clearHandles();
    this.initData = undefined;
    this.startData = undefined;
  }
}

export default DebugAltsManager;
