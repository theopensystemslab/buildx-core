import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { HouseGroup } from "../objects/house/HouseGroup";

class ContextManager {
  _buildingHouseGroup: O.Option<HouseGroup>;
  _buildingRowIndex: O.Option<number>;

  constructor() {
    this._buildingHouseGroup = O.none;
    this._buildingRowIndex = O.none;
  }

  get buildingHouseGroup(): O.Option<HouseGroup> {
    return this._buildingHouseGroup;
  }

  set buildingHouseGroup(nextOption: O.Option<HouseGroup>) {
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
}

export default ContextManager;
