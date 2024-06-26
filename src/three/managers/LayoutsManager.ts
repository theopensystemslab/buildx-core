import { O } from "@/utils/functions";
import { ColumnLayoutGroup } from "../objects/house/ColumnLayoutGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { hideObject, showObject } from "../utils/layers";
import { pipe } from "fp-ts/lib/function";

class LayoutsManager {
  houseGroup: HouseGroup;

  private _activeLayoutGroup: O.Option<ColumnLayoutGroup>;
  private _previewLayoutGroup: O.Option<ColumnLayoutGroup>;

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this._activeLayoutGroup = O.none;
    this._previewLayoutGroup = O.none;
  }

  get activeLayoutGroup(): O.Option<ColumnLayoutGroup> {
    return this._activeLayoutGroup;
  }

  set activeLayoutGroup(layoutGroup: ColumnLayoutGroup) {
    const previewNone = () => {
      pipe(this.activeLayoutGroup, O.map(hideObject));
      showObject(layoutGroup);
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
              hideObject(activeLayoutGroup);
              showObject(previewLayoutGroup);
              this._previewLayoutGroup = O.some(previewLayoutGroup);
            })
          );
        } else {
          const incomingNone = () => {
            pipe(this._activeLayoutGroup, O.map(showObject));
            pipe(this._previewLayoutGroup, O.map(hideObject));
            this._previewLayoutGroup = O.none;
          };

          const incomingSome = (incoming: ColumnLayoutGroup) => {
            showObject(incoming);
            pipe(this._previewLayoutGroup, O.map(hideObject));
            this._previewLayoutGroup = O.some(incoming);
          };

          pipe(incoming, O.match(incomingNone, incomingSome));
        }
      })
    );
  }
}

export default LayoutsManager;
