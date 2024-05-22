import { cachedElementsTE, cachedHouseTypesTE } from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import { createBasicScene } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
import { ColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { A, O, TE } from "@/utils/functions";
import { GUI } from "dat.gui";
import { flow, pipe } from "fp-ts/lib/function";
import { AxesHelper } from "three";

const gui = new GUI({ hideable: false });

// Create folders for better organization
const houseTypeFolder = gui.addFolder("House Type");
let elementCategoriesFolder: GUI | null = null;
let cutsFolder: GUI | null = null; // Folder for cut modes

const { addObjectToScene, render, scene } = createBasicScene({
  outliner: (object) => {
    return object.parent && isModuleGroup(object.parent)
      ? object.parent.children
      : [];
  },
});

addObjectToScene(new AxesHelper());

const initCategories = flow(
  A.reduce([], (b: string[], a: BuildElement) =>
    b.includes(a.category) ? b : [...b, a.category]
  ),
  A.reduce({}, (b: Record<string, boolean>, a: string) => ({ ...b, [a]: true }))
);

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
      if (cutsFolder !== null) {
        cutsFolder.__controllers.forEach((controller) => {
          cutsFolder?.remove(controller);
        });
        gui.removeFolder(cutsFolder);
      }

      pipe(
        houseTypes,
        A.findFirst((x) => x.name === houseTypeName),
        O.map(({ systemId, id: houseTypeId, dnas, name }) => {
          pipe(
            houseGroupTE({
              systemId,
              dnas,
              friendlyName: name,
              houseId: houseTypeId,
              houseTypeId,
            }),
            TE.map((houseGroup) => {
              const columnLayoutGroup = houseGroup.activeLayoutGroup;

              window.addEventListener("keydown", (ev) => {
                switch (ev.key) {
                  case "c":
                    // columnLayoutGroup.cutsManager.debugClippingBrush();
                    // columnLayoutGroup.cutsManager.cycleClippingBrush();
                    houseGroup.activeLayoutGroup.cutsManager.cycleClippingBrush();
                    break;
                  case "s":
                    houseGroup.layoutsManager.cycleSectionTypeLayout();
                    break;
                }
                render();
              });

              const { elementsManager } = houseGroup;

              addObjectToScene(houseGroup);

              columnLayoutGroup.updateOBB();

              pipe(
                cachedElementsTE,
                TE.map((elements) => {
                  elementCategoriesFolder = gui.addFolder("Element Categories");
                  cutsFolder = gui.addFolder("Cuts"); // Initialize the Cuts folder
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

                  // cutsFolder
                  //   ?.add(
                  //     {
                  //       cutMode: "No Cut",
                  //     },
                  //     "cutMode",
                  //     ["No Cut", "X-cut", "Y-cut", "Z-cut"]
                  //   )
                  //   .onChange((value) => {
                  //     switch (value) {
                  //       case "X-cut":              const { cutsManager } = columnLayoutGroup;
                  //         cutsManager.setClippingBrushX();
                  //         cutsManager.createClippedBrushes();
                  //         cutsManager.showClippedBrushes();
                  //         break;
                  //       case "Y-cut":
                  //         cutsManager.setClippingBrushY(1);
                  //         cutsManager.createClippedBrushes();
                  //         cutsManager.showClippedBrushes();
                  //         break;
                  //       case "Z-cut":
                  //         cutsManager.setClippingBrushZ();
                  //         cutsManager.createClippedBrushes();
                  //         cutsManager.showClippedBrushes();
                  //         break;
                  //       default:
                  //         cutsManager.destroyClippedBrushes();
                  //         cutsManager.showElementBrushes();
                  //         break;
                  //     }
                  //     render();
                  //   });

                  elementCategoriesFolder?.open();
                  cutsFolder?.open();
                })
              )();
            })
          )();
        })
      );
    };

    const name = houseTypes[1].name;

    // Add the house type selection to its own folder
    houseTypeFolder.add({ name }, "name", options).onChange(go);
    houseTypeFolder.open();

    go(name);
  })
)();