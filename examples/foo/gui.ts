import { cachedElementsTE } from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import { A, TE } from "@/utils/functions";
import { GUI } from "dat.gui";
import { flow, pipe } from "fp-ts/lib/function";

const elementsToCategories = A.reduce([], (b: string[], a: BuildElement) =>
  b.includes(a.category) ? b : [...b, a.category]
);

const categoriesToOptions = A.reduce(
  {},
  (b: Record<string, boolean>, a: string) => ({
    ...b,
    [a]: true,
  })
);

const initCategories = flow(elementsToCategories, categoriesToOptions);

const gui = ({
  elementsManager,
  cutsManager,
  render,
}: {
  elementsManager: ElementsManager;
  cutsManager: CutsManager;
  render: () => void;
}) => {
  pipe(
    cachedElementsTE,
    TE.map((elements) => {
      const elementCategories: Record<string, boolean> =
        initCategories(elements);

      const gui = new GUI();

      const elementCategoriesFolder = gui.addFolder("Element Categories");

      Object.entries(elementCategories).forEach(([category]) => {
        elementCategoriesFolder
          .add(elementCategories, category)
          .onChange(() => {
            elementsManager.setCategoryVisibility(
              category,
              elementCategories[category]
            );
            render();
          });
      });

      const masterToggle = {
        "Toggle All": function () {
          let allEnabled = Object.values(elementCategories).every(
            (value) => value
          );
          Object.keys(elementCategories).forEach((key) => {
            elementCategories[key] = !allEnabled;
          });
          elementCategoriesFolder.__controllers.forEach((controller) => {
            controller.updateDisplay();
          });
          elementsManager.setAllElementsVisibility(!allEnabled);
          render();
        },
      };
      elementCategoriesFolder.add(masterToggle, "Toggle All");

      elementCategoriesFolder.open();

      // Vertical cut X
      const cutsState = {
        verticalCutX: false,
        verticalCutZ: false,
      };

      gui
        .add(cutsState, "verticalCutX")
        .name("Vertical Cut X")
        .onChange((_value) => {
          // elementsManager.setVerticalCutX(value);
          render();
        });

      // Vertical cut Z
      gui
        .add(cutsState, "verticalCutZ")
        .name("Vertical Cut Z")
        .onChange((value) => {
          cutsManager.setVerticalCutZ(value);
          // elementsManager.setVerticalCutZ(value);
          render();
          console.log(`cut z ${value}`);
        });
    })
  )();
};

export default gui;
