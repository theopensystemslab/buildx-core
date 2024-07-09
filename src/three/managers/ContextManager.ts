import { O } from "@/utils/functions";
import { identity, pipe } from "fp-ts/lib/function";
import { z } from "zod";
import { ElementGroup } from "../objects/house/ElementGroup";
import { HouseGroup } from "../objects/house/HouseGroup";

export const SiteCtxModeEnum = z.enum(["SITE", "BUILDING", "ROW"]);

export type SiteCtxModeEnum = z.infer<typeof SiteCtxModeEnum>;

export type SiteCtxMode = {
  label: SiteCtxModeEnum;
  buildingHouseGroup: O.Option<HouseGroup>;
  buildingRowIndex: O.Option<number>;
};

type ContextManagerConfig = {
  onModeChange?: (prev: SiteCtxMode, next: SiteCtxMode) => void;
};

class ContextManager {
  _buildingHouseGroup: O.Option<HouseGroup>;
  _buildingRowIndex: O.Option<number>;

  onModeChange?: (prev: SiteCtxMode, next: SiteCtxMode) => void;

  constructor(config?: ContextManagerConfig) {
    const { onModeChange } = config ?? {};

    this.onModeChange = onModeChange;

    this._buildingHouseGroup = O.none;
    this._buildingRowIndex = O.none;
  }

  get siteMode() {
    return O.isNone(this._buildingHouseGroup);
  }

  get buildingMode() {
    return (
      O.isNone(this._buildingRowIndex) && O.isSome(this._buildingHouseGroup)
    );
  }

  get rowMode() {
    return O.isSome(this._buildingRowIndex);
  }

  get mode(): SiteCtxMode {
    const { buildingHouseGroup, buildingRowIndex } = this;

    const mode = (function () {
      if (O.isNone(buildingHouseGroup)) return SiteCtxModeEnum.Enum.SITE;
      else if (O.isSome(buildingHouseGroup)) {
        if (O.isSome(buildingRowIndex)) {
          return SiteCtxModeEnum.Enum.ROW;
        } else {
          return SiteCtxModeEnum.Enum.BUILDING;
        }
      } else {
        throw new Error(`invalid mode state on ContextManager`);
      }
    })();

    return {
      label: mode,
      buildingHouseGroup,
      buildingRowIndex,
    };
  }

  get buildingHouseGroup(): O.Option<HouseGroup> {
    return this._buildingHouseGroup;
  }

  set buildingHouseGroup(nextOption: O.Option<HouseGroup>) {
    let prevMode = this.mode;

    // 1. hide other houses
    // 2. change outlining stuff if activated

    pipe(
      this._buildingHouseGroup,
      O.map((prev) => {
        // come out of prev building house
        prev.zStretchManager?.cleanup();
        prev.zStretchManager?.hideHandles();
        prev.zStretchManager?.cleanup();
        prev.xStretchManager?.hideHandles();
      })
    );

    pipe(
      nextOption,
      O.match(
        () => {},
        (next) => {
          // go into next building house
          next.zStretchManager?.init();
          next.zStretchManager?.showHandles();
          next.xStretchManager?.init();
          next.xStretchManager?.showHandles();
        }
      )
    );

    this._buildingHouseGroup = nextOption;

    let nextMode = this.mode;

    this.onModeChange?.(prevMode, nextMode);
  }

  get buildingRowIndex(): O.Option<number> {
    return this._buildingRowIndex;
  }

  set buildingRowIndex(rowIndex: O.Option<number>) {
    // 0. if no building house group what?
    pipe(
      this._buildingHouseGroup,
      O.match(
        () => {
          throw new Error(
            `set buildingRowIndex with O.none buildingHouseGroup`
          );
        },
        (buildingHouseGroup) => {
          pipe(
            rowIndex,
            O.match(
              // pop back out of row
              () => {
                pipe(
                  buildingHouseGroup.activeLayoutGroup,
                  O.map((activeLayoutGroup) => {
                    buildingHouseGroup.cutsManager?.setClippingBrush({
                      ...buildingHouseGroup.cutsManager.settings,
                      rowIndex: null,
                    });
                    buildingHouseGroup.cutsManager?.createObjectCuts(
                      activeLayoutGroup
                    );
                    buildingHouseGroup.cutsManager?.showAppropriateBrushes(
                      activeLayoutGroup
                    );
                  })
                );
              },
              // drill into the row
              (rowIndex) => {
                const { cutsManager, activeLayoutGroup, xStretchManager } =
                  buildingHouseGroup;
                pipe(
                  activeLayoutGroup,
                  O.map((activeLayoutGroup) => {
                    cutsManager?.setClippingBrush({
                      ...cutsManager.settings,
                      rowIndex,
                    });
                    cutsManager?.createObjectCuts(activeLayoutGroup);
                    cutsManager?.showClippedBrushes(activeLayoutGroup);

                    xStretchManager?.initData?.alts?.forEach(
                      ({ layoutGroup }) => {
                        if (layoutGroup === activeLayoutGroup) return;
                        cutsManager?.createObjectCuts(layoutGroup);
                      }
                    );
                  })
                );
              }
            )
          );

          this._buildingRowIndex = rowIndex;
        }
      )
    );
  }

  contextDown(elementGroup: ElementGroup) {
    pipe(
      this._buildingRowIndex,
      O.match(() => {
        pipe(
          this._buildingHouseGroup,
          O.match(
            // go into building
            () => {
              this.buildingHouseGroup = O.some(elementGroup.houseGroup);
            },
            // go into level
            () => {
              const { rowIndex } = elementGroup.rowGroup.userData;
              this.buildingRowIndex = O.some(rowIndex);
            }
          )
        );
      }, identity)
    );
  }

  contextUp() {
    pipe(
      this._buildingRowIndex,
      O.match(
        () => {
          pipe(
            this._buildingHouseGroup,
            O.map(() => {
              this.buildingHouseGroup = O.none;
            })
          );
        },
        () => {
          this.buildingRowIndex = O.none;
        }
      )
    );
  }
}

export default ContextManager;
