import { O } from "@/utils/functions";
import { identity, pipe } from "fp-ts/lib/function";
import { z } from "zod";
import { ElementGroup } from "../objects/house/ElementGroup";
import { HouseGroup } from "../objects/house/HouseGroup";

export const SceneContextModeLabel = z.enum(["SITE", "BUILDING", "ROW"]);

export type SceneContextModeLabel = z.infer<typeof SceneContextModeLabel>;

export type SceneContextMode = {
  label: SceneContextModeLabel;
  selectedHouses: HouseGroup[];
  buildingHouseGroup: O.Option<HouseGroup>;
  buildingRowIndex: O.Option<number>;
};

type ContextManagerConfig = {
  onModeChange?: (prev: SceneContextMode, next: SceneContextMode) => void;
};

class ContextManager {
  _buildingHouseGroup: O.Option<HouseGroup>;
  _buildingRowIndex: O.Option<number>;
  _selectedHouses: HouseGroup[];

  onModeChange?: (prev: SceneContextMode, next: SceneContextMode) => void;

  constructor(config?: ContextManagerConfig) {
    const { onModeChange } = config ?? {};

    this.onModeChange = onModeChange;

    this._buildingHouseGroup = O.none;
    this._buildingRowIndex = O.none;

    this._selectedHouses = [];
  }

  pushSelectedHouse(houseGroup: HouseGroup) {
    this._selectedHouses.push(houseGroup);
  }

  get selectedHouses() {
    return this._selectedHouses;
  }

  set selectedHouse(houseGroup: HouseGroup) {
    this._selectedHouses.forEach((houseGroup) => {
      houseGroup.managers.rotate?.hideHandles();
    });

    this._selectedHouses = [houseGroup];

    if (this.mode.label === SceneContextModeLabel.Enum.SITE) {
      this._selectedHouses.forEach((houseGroup) => {
        houseGroup.managers.rotate?.showHandles();
      });
    }
  }

  setSelectedHouse(houseGroup: HouseGroup) {
    this.selectedHouse = houseGroup;
  }

  clearSelectedHouses() {
    this._selectedHouses.forEach((houseGroup) => {
      houseGroup.managers.rotate?.hideHandles();
    });
    this._selectedHouses = [];
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

  get mode(): SceneContextMode {
    const { buildingHouseGroup, buildingRowIndex } = this;

    const mode = (function () {
      if (O.isNone(buildingHouseGroup)) return SceneContextModeLabel.Enum.SITE;
      else if (O.isSome(buildingHouseGroup)) {
        if (O.isSome(buildingRowIndex)) {
          return SceneContextModeLabel.Enum.ROW;
        } else {
          return SceneContextModeLabel.Enum.BUILDING;
        }
      } else {
        throw new Error(`invalid mode state on ContextManager`);
      }
    })();

    return {
      label: mode,
      buildingHouseGroup,
      buildingRowIndex,
      selectedHouses: this._selectedHouses,
    };
  }

  get buildingHouseGroup(): O.Option<HouseGroup> {
    return this._buildingHouseGroup;
  }

  private getOtherHouses(house?: HouseGroup) {
    if (!house?.parent) return [];
    return house.parent.children.filter(
      (child) => child instanceof HouseGroup && child !== house
    ) as HouseGroup[];
  }

  set buildingHouseGroup(nextOption: O.Option<HouseGroup>) {
    let prevMode = this.mode;

    pipe(
      this._buildingHouseGroup,
      O.map((prev) => {
        // come out of prev building house
        prev.managers.zStretch?.cleanup();
        prev.managers.xStretch?.cleanup();

        // Show all other houses when leaving current house
        this.getOtherHouses(prev).forEach((house) => {
          house.visible = true;
        });
      })
    );

    pipe(
      nextOption,
      O.match(
        () => {},
        (next) => {
          // Hide all other houses
          this.getOtherHouses(next).forEach((house) => {
            house.visible = false;
          });

          // hide rotate handles
          next.managers.rotate?.hideHandles();
          // go into next building house
          next.managers.zStretch?.init();
          next.managers.zStretch?.showHandles();
          next.managers.xStretch?.init();
          next.managers.xStretch?.showHandles();
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
    let prevMode = this.mode;

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
                    buildingHouseGroup.managers.cuts?.setClippingBrush({
                      ...buildingHouseGroup.managers.cuts.settings,
                      rowIndex: null,
                    });
                    buildingHouseGroup.managers.cuts?.createClippedBrushes(
                      activeLayoutGroup
                    );
                    buildingHouseGroup.managers.cuts?.showAppropriateBrushes(
                      activeLayoutGroup
                    );
                  })
                );
              },
              // drill into the row
              (rowIndex) => {
                const {
                  managers: { cuts },
                  activeLayoutGroup,
                } = buildingHouseGroup;
                pipe(
                  activeLayoutGroup,
                  O.map((activeLayoutGroup) => {
                    cuts?.setClippingBrush({
                      ...cuts.settings,
                      rowIndex,
                    });
                    cuts?.createClippedBrushes(activeLayoutGroup);
                    cuts?.showAppropriateBrushes(activeLayoutGroup);
                  })
                );
              }
            )
          );

          this._buildingRowIndex = rowIndex;
        }
      )
    );

    let nextMode = this.mode;

    this.onModeChange?.(prevMode, nextMode);
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
