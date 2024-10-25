import { cachedHouseTypesTE } from "@/data/build-systems";
import columnLayoutGroupTE from "@/tasks/columnLayoutGroupTE";
import { A, O, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";

class LayoutsManager {
  houseGroup: HouseGroup;

  private _activeLayoutGroup: O.Option<ColumnLayoutGroup>;
  private _previewLayoutGroup: O.Option<ColumnLayoutGroup>;
  private _houseTypeLayoutGroup: O.Option<ColumnLayoutGroup>;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this._activeLayoutGroup = O.none;
    this._previewLayoutGroup = O.none;
    this._houseTypeLayoutGroup = O.none;
  }

  prepareHouseTypeLayoutGroup() {
    const { houseTypeId } = this.houseGroup.userData;
    pipe(
      cachedHouseTypesTE,
      TE.chain((houseTypes) =>
        pipe(
          houseTypes,
          A.findFirst((x) => x.id === houseTypeId),
          TE.fromOption(() => new Error(`no house type`)),
          TE.chain(({ systemId, dnas }) =>
            columnLayoutGroupTE({ systemId, dnas })
          )
        )
      ),
      TE.map((columnLayoutGroup) => {
        columnLayoutGroup.hide();
        this.houseGroup.add(columnLayoutGroup);
        this._houseTypeLayoutGroup = O.some(columnLayoutGroup);
      })
    )();
  }

  get houseTypeLayoutGroup() {
    return this._houseTypeLayoutGroup;
  }

  resetToHouseTypeLayoutGroup() {
    if (this.houseTypeLayoutGroup._tag === "Some") {
      this.activeLayoutGroup = this.houseTypeLayoutGroup.value;
      this.prepareHouseTypeLayoutGroup();
      this.houseGroup.updateDB();
    }
  }

  get activeLayoutGroup(): O.Option<ColumnLayoutGroup> {
    return this._activeLayoutGroup;
  }

  set activeLayoutGroup(layoutGroup: ColumnLayoutGroup) {
    const previewNone = () => {
      pipe(
        this.activeLayoutGroup,
        O.map((x) => x.hide())
      );
      layoutGroup.show();
      this._activeLayoutGroup = O.some(layoutGroup);
    };

    const previewSome = (previewLayoutGroup: ColumnLayoutGroup) => {
      if (previewLayoutGroup !== layoutGroup)
        throw new Error(
          `unexpected setting active layout group different than preivew`
        );
      this._activeLayoutGroup = this._previewLayoutGroup;
      this._previewLayoutGroup = O.none;
    };

    pipe(this.previewLayoutGroup, O.match(previewNone, previewSome));
  }

  get previewLayoutGroup(): O.Option<ColumnLayoutGroup> {
    return this._previewLayoutGroup;
  }

  set previewLayoutGroup(incoming: O.Option<ColumnLayoutGroup>) {
    pipe(
      this.activeLayoutGroup,
      O.map((activeLayoutGroup: ColumnLayoutGroup) => {
        if (activeLayoutGroup.visible) {
          pipe(
            incoming,
            O.map((previewLayoutGroup) => {
              activeLayoutGroup.hide();
              previewLayoutGroup.show();
              this._previewLayoutGroup = O.some(previewLayoutGroup);
            })
          );
        } else {
          const incomingNone = () => {
            pipe(
              this._activeLayoutGroup,
              O.map((x) => x.show())
            );
            pipe(
              this._previewLayoutGroup,
              O.map((x) => x.hide())
            );
            this._previewLayoutGroup = O.none;
          };

          const incomingSome = (incoming: ColumnLayoutGroup) => {
            incoming.show();
            pipe(
              this._previewLayoutGroup,
              O.map((x) => x.hide())
            );
            this._previewLayoutGroup = O.some(incoming);
          };

          pipe(incoming, O.match(incomingNone, incomingSome));
        }
      })
    );
  }
}

export default LayoutsManager;
