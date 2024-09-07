import {
  unsafeGetElementByIfcTag,
  unsafeGetMaterialBySpec,
} from "@/data/build-systems";
import { A, O, R } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { getThreeMaterial } from "../materials/getThreeMaterial";
import {
  ClippedElementBrush,
  ElementGroup,
  FullElementBrush,
} from "../objects/house/ElementGroup";
import { HouseGroup } from "../objects/house/HouseGroup";
import { clippingMaterial } from "./CutsManager";
import { updateCachedHouse } from "@/data/user/houses";

class ElementsManager {
  houseGroup: HouseGroup;
  overrides: Record<string, string> = {};

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
  }

  setElementMaterial(ifcTag: string, materialSpec: string) {
    const material = unsafeGetMaterialBySpec(materialSpec);
    const threeMaterial = getThreeMaterial(material);

    this.houseGroup.traverse((node) => {
      if (
        node instanceof ElementGroup &&
        node.userData.element.ifcTag === ifcTag
      ) {
        node.traverse((child) => {
          if (child instanceof FullElementBrush) {
            child.material = threeMaterial;
          } else if (child instanceof ClippedElementBrush) {
            child.material = [threeMaterial, clippingMaterial];
          }
        });
      }
    });

    this.overrides[ifcTag] = materialSpec;

    updateCachedHouse(this.houseGroup.userData.houseId, {
      activeElementMaterials: this.overrides,
    });
  }

  resetElementMaterials() {
    Object.keys(this.overrides).forEach((ifcTag) => {
      const element = unsafeGetElementByIfcTag(ifcTag);
      this.setElementMaterial(ifcTag, element.defaultMaterial);
    });

    updateCachedHouse(this.houseGroup.userData.houseId, {
      activeElementMaterials: {},
    });
  }

  getCurrentElementMaterial(ifcTag: string) {
    const element = unsafeGetElementByIfcTag(ifcTag);

    return pipe(
      this.overrides,
      R.lookup(ifcTag),
      O.match(
        () => unsafeGetMaterialBySpec(element.defaultMaterial),
        (materialSpec) => unsafeGetMaterialBySpec(materialSpec)
      )
    );
  }

  getElementMaterialOptions(ifcTag: string) {
    const element = unsafeGetElementByIfcTag(ifcTag);

    const currentMaterial = this.getCurrentElementMaterial(ifcTag);

    const otherMaterials = pipe(
      [element.defaultMaterial, ...element.materialOptions],
      A.filterMap((spec) =>
        pipe(
          O.fromNullable(unsafeGetMaterialBySpec(spec)),
          O.filter((material) => material !== currentMaterial)
        )
      )
    );

    return {
      otherMaterials,
      currentMaterial,
    };
  }

  setAllElementsVisibility(visible: boolean) {
    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        node.visible = visible;
      }
    });
  }

  setCategoryVisibility(category: string, visible: boolean) {
    this.houseGroup.traverse((node) => {
      if (
        node instanceof ElementGroup &&
        node.userData.element.category === category
      ) {
        node.visible = visible;
      }
    });
  }

  updateDB() {
    // update our user database with the current overrides
  }
}

export default ElementsManager;
