import {
  unsafeGetElementByIfcTag,
  unsafeGetMaterialBySpec,
  BuildElement,
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

class ElementsManager {
  houseGroup: HouseGroup;
  overrides: Record<string, string> = {};
  private categories: Map<string, boolean> = new Map();

  constructor(houseGroup: HouseGroup) {
    this.houseGroup = houseGroup;
    this.updateCategories();
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

  updateCategories() {
    const newCategories = new Map<string, boolean>();
    let inconsistencyDetected = false;

    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        const category = node.userData.element.category;
        if (!newCategories.has(category)) {
          newCategories.set(category, node.visible);
        } else if (newCategories.get(category) !== node.visible) {
          inconsistencyDetected = true;
        }
      }
    });

    if (inconsistencyDetected) {
      throw new Error(
        "Inconsistent ElementGroup visibility detected within the same category"
      );
    }

    this.categories = newCategories;
  }

  setCategories(newCategories: Map<string, boolean>) {
    // Update the categories map
    this.categories = new Map(newCategories);

    // Enforce visibility changes
    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        const category = node.userData.element.category;
        const isVisible = this.categories.get(category);
        if (isVisible !== undefined) {
          node.visible = isVisible;
        }
      }
    });
  }

  setAllElementsVisibility(visible: boolean) {
    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        node.visible = visible;
      }
    });
    this.categories.forEach((_, category) => {
      this.categories.set(category, visible);
    });
  }

  setCategoryVisibility(category: string, visible: boolean) {
    if (this.categories.has(category)) {
      this.categories.set(category, visible);
      this.houseGroup.traverse((node) => {
        if (
          node instanceof ElementGroup &&
          node.userData.element.category === category
        ) {
          node.visible = visible;
        }
      });
    }
  }

  getAllElements(): BuildElement[] {
    const elements: BuildElement[] = [];
    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        elements.push(node.userData.element);
      }
    });
    return elements;
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getCategoriesMap(): Map<string, boolean> {
    return new Map(this.categories);
  }

  getElementsByCategory(): Map<string, BuildElement[]> {
    const elementsByCategory = new Map<string, BuildElement[]>();
    this.houseGroup.traverse((node) => {
      if (node instanceof ElementGroup) {
        const element = node.userData.element;
        if (!elementsByCategory.has(element.category)) {
          elementsByCategory.set(element.category, []);
        }
        elementsByCategory.get(element.category)!.push(element);
      }
    });
    return elementsByCategory;
  }
}

export default ElementsManager;
