import { cachedElementsTE, cachedHouseTypesTE } from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import { createBasicScene } from "@/index";
import columnLayoutGroupTE from "@/tasks/columnLayoutTE";
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
let cutsFolder: GUI | null = null;
let stretchFolder: GUI | null = null;

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
        O.map((houseType) => {
          pipe(
            columnLayoutGroupTE(houseType),
            TE.map(async (columnLayoutGroup) => {
              const { cutsManager, elementsManager } = columnLayoutGroup;

              addObjectToScene(columnLayoutGroup);

              columnLayoutGroup.updateOBB();

              const stretchParams = {
                depth: 0,
                side: 1,
              };

              stretchFolder = gui.addFolder("Stretch");

              const depthController = stretchFolder.add(
                stretchParams,
                "depth",
                -5,
                5,
                0.01
              );

              depthController.listen();
              depthController.onChange((depth) => {
                stretchParams.depth = depth;

                columnLayoutGroup.zStretchManager.progress(
                  stretchParams.depth,
                  stretchParams.side
                );

                render();
              });

              stretchFolder
                .add(stretchParams, "side", { Positive: 1, Negative: -1 })
                .name("Side")
                .listen()
                .onChange((v) => {
                  stretchParams.side = Number(v);

                  columnLayoutGroup.zStretchManager.progress(
                    stretchParams.depth,
                    stretchParams.side
                  );
                });

              stretchFolder.open();

              await columnLayoutGroup.zStretchManager.init();

              columnLayoutGroup.zStretchManager.first(stretchParams.side);

              // window.addEventListener("keydown", async (ev) => {
              //   switch (ev.key) {
              //     case "s":
              //   }
              // });

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

                  cutsFolder
                    ?.add(
                      {
                        cutMode: "No Cut",
                      },
                      "cutMode",
                      ["No Cut", "X-cut", "Y-cut", "Z-cut"]
                    )
                    .onChange((value) => {
                      switch (value) {
                        case "X-cut":
                          cutsManager.setClippingBrushX();
                          cutsManager.createClippedBrushes();
                          cutsManager.showClippedBrushes();
                          break;
                        case "Y-cut":
                          cutsManager.setClippingBrushY(1);
                          cutsManager.createClippedBrushes();
                          cutsManager.showClippedBrushes();
                          break;
                        case "Z-cut":
                          cutsManager.setClippingBrushZ();
                          cutsManager.createClippedBrushes();
                          cutsManager.showClippedBrushes();
                          break;
                        default:
                          cutsManager.destroyClippedBrushes();
                          cutsManager.showElementBrushes();
                          break;
                      }
                      render();
                    });

                  elementCategoriesFolder?.open();
                  cutsFolder?.open();
                })
              )();
            })
          )();
        })
      );
    };

    // Add the house type selection to its own folder
    houseTypeFolder
      .add({ name: houseTypes[0].name }, "name", options)
      .onChange(go);
    houseTypeFolder.open();

    go(houseTypes[0].name);
  })
)();
