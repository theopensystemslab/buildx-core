import { cachedElementsTE, cachedHouseTypesTE } from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import { createBasicScene } from "@/index";
import columnLayoutTE from "@/tasks/columnLayoutTE";
import CutsManager from "@/three/managers/CutsManager";
import ElementsManager from "@/three/managers/ElementsManager";
import { ColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { A, O, TE } from "@/utils/functions";
import { GUI } from "dat.gui";
import { flow, pipe } from "fp-ts/lib/function";
import { AxesHelper } from "three";

const gui = new GUI({ hideable: false });

let elementCategoriesFolder: GUI | null = null;

const { addObjectToScene, render, scene } = createBasicScene({
  outliner: (object) => {
    return object.parent && isModuleGroup(object.parent)
      ? object.parent.children
      : [];
  },
});

addObjectToScene(new AxesHelper());

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

pipe(
  cachedHouseTypesTE,
  TE.map((houseTypes) => {
    const options = houseTypes.map((x) => x.name);

    const go = (houseTypeName: string) => {
      scene.children.forEach((x) => {
        if (x instanceof ColumnLayoutGroup) {
          scene.remove(x);
        }
      });

      if (elementCategoriesFolder !== null) {
        elementCategoriesFolder.__controllers.forEach((controller) => {
          elementCategoriesFolder?.remove(controller);
        });
        gui.removeFolder(elementCategoriesFolder);
      }

      pipe(
        houseTypes,
        A.findFirst((x) => x.name === houseTypeName),
        O.map((houseType) => {
          pipe(
            columnLayoutTE(houseType),
            TE.map((columnLayoutGroup) => {
              addObjectToScene(columnLayoutGroup);

              const elementsManager = new ElementsManager(columnLayoutGroup);
              const cutsManager = new CutsManager(columnLayoutGroup);

              pipe(
                cachedElementsTE,
                TE.map((elements) => {
                  // Create a new folder for this invocation of `go`
                  elementCategoriesFolder = gui.addFolder("Element Categories");

                  const elementCategories: Record<string, boolean> =
                    initCategories(elements);

                  Object.entries(elementCategories).forEach(([category]) => {
                    elementCategoriesFolder
                      ?.add(elementCategories, category)
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
                      elementCategoriesFolder?.__controllers.forEach(
                        (controller) => {
                          controller.updateDisplay();
                        }
                      );
                      elementsManager.setAllElementsVisibility(!allEnabled);
                      render();
                    },
                  };
                  elementCategoriesFolder?.add(masterToggle, "Toggle All");

                  elementCategoriesFolder?.open();

                  window.addEventListener("keydown", (event) => {
                    switch (event.key) {
                      case "d":
                        cutsManager.destroyClippedBrushes();
                        cutsManager.showElementBrushes();
                        break;
                      case "x":
                        cutsManager.setClippingBrushX();
                        cutsManager.createClippedBrushes();
                        cutsManager.showClippedBrushes();
                        break;
                      case "z":
                        cutsManager.setClippingBrushZ();
                        cutsManager.createClippedBrushes();
                        cutsManager.showClippedBrushes();
                        break;
                    }
                    render();
                  });
                })
              )();
            })
          )();
        })
      );
    };

    gui.add({ name: houseTypes[0].name }, "name", options).onChange(go);

    go(houseTypes[0].name);
  })
)();
