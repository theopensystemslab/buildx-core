import { cachedElementsTE } from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import { A, TE } from "@/utils/functions";
import { GUI } from "dat.gui";
import { flow, pipe } from "fp-ts/lib/function";
import { Scene } from "three";

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
  scene,
}: {
  elementsManager: ElementsManager;
  cutsManager: CutsManager;
  render: () => void;
  scene: Scene;
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
        .onChange((value) => {
          cutsManager.clipWidth = value;
          cutsManager.updateClippingBrush();
          // cutsManager.debugClippingBrush(scene, value);
          if (value) {
            cutsManager.updateClippedBrushes();
            cutsManager.showClippedBrushes();
          } else {
            cutsManager.destroyClippedBrushes();
            cutsManager.showElementBrushes();
          }
          // cutsManager.setClippingBrush();
          render();
        });

      // Vertical cut Z
      gui
        .add(cutsState, "verticalCutZ")
        .name("Vertical Cut Z")
        .onChange((value) => {
          // cutsManager.clipDepth = value;
          // cutsManager.setClippingBrush();
          // cutsManager.updateClippedBrushes();
          // render();
        });
    })
  )();
};

export default gui;
