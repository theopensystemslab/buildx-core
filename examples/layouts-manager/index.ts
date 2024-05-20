import { cachedElementsTE, cachedHouseTypesTE } from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import { createBasicScene } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
import { getMeshes } from "@/three/effects/outline";
import { ColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { ElementBrush } from "@/three/objects/house/ElementGroup";
import { A, O, TE } from "@/utils/functions";
import { Gesture } from "@use-gesture/vanilla";
import { GUI } from "dat.gui";
import { flow, pipe } from "fp-ts/lib/function";
import {
  AxesHelper,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Raycaster,
  Scene,
  Vector2,
} from "three";

const gui = new GUI({ hideable: false });

// Create folders for better organization
const houseTypeFolder = gui.addFolder("House Type");
let elementCategoriesFolder: GUI | null = null;
let cutsFolder: GUI | null = null;
let stretchFolder: GUI | null = null;

const { addObjectToScene, render, scene, renderer, camera } =
  createBasicScene();

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
        O.map(({ systemId, id: houseTypeId, dnas }) => {
          pipe(
            houseGroupTE({
              systemId,
              houseTypeId,
              dnas,
              houseId: "foo",
              friendlyName: "foo",
            }),
            TE.map(async (houseGroup) => {
              const { elementsManager, layoutsManager, cutsManager } =
                houseGroup;
              const columnLayoutGroup = houseGroup.getActiveLayoutGroup();

              addObjectToScene(houseGroup);

              columnLayoutGroup.updateOBB();

              const stretchParams = {
                depth: 0,
                side: 1 as 1 | -1,
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

                columnLayoutGroup.zStretchManager.gestureProgress(
                  stretchParams.depth
                  // stretchParams.side
                );

                render();
              });

              stretchFolder
                .add(stretchParams, "side", { Positive: 1, Negative: -1 })
                .name("Side")
                .listen()
                .onChange((v) => {
                  stretchParams.side = Number(v) as 1 | -1;
                  stretchParams.depth = 0;

                  columnLayoutGroup.zStretchManager.gestureStart(
                    // stretchParams.depth,
                    stretchParams.side
                  );
                });

              stretchFolder.open();

              await columnLayoutGroup.zStretchManager.init();

              columnLayoutGroup.zStretchManager.gestureStart(
                stretchParams.side
              );

              houseGroup.layoutsManager.refreshAltSectionTypeLayouts();

              window.addEventListener("keydown", async (ev) => {
                switch (ev.key) {
                  case "s":
                    layoutsManager.swapSomeLayout();
                }
              });

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

    const defaultHouseTypeName = houseTypes[2].name;

    // Add the house type selection to its own folder
    houseTypeFolder
      .add({ name: defaultHouseTypeName }, "name", options)
      .onChange(go);
    houseTypeFolder.open();

    go(defaultHouseTypeName);
  })
)();

const raycaster = new Raycaster();

// Function to create a line representing the ray
const createRayLine = (raycaster: Raycaster, length = 100) => {
  const points = [
    raycaster.ray.origin,
    raycaster.ray.origin
      .clone()
      .add(raycaster.ray.direction.clone().multiplyScalar(length)),
  ];

  const geometry = new BufferGeometry().setFromPoints(points);
  const material = new LineBasicMaterial({ color: 0xff0000 });
  return new Line(geometry, material);
};

// Clear previous ray lines
const clearRayLines = (scene: Scene) => {
  scene.children = scene.children.filter((child) => !(child instanceof Line));
};

new Gesture(renderer.domElement, {
  onClick: (ev) => {
    const { x, y } = ev.event;

    // Normalize the coordinates to NDC
    const ndcX = (x / window.innerWidth) * 2 - 1;
    const ndcY = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera);

    // Draw the ray for visual debugging
    clearRayLines(scene);
    const rayLine = createRayLine(raycaster);
    scene.add(rayLine);

    pipe(
      raycaster.intersectObjects(scene.children, true),
      A.head,
      O.map(({ object }) => {
        if (object instanceof ElementBrush) {
          const moduleGroup = object.getModuleGroup();
          // outlineObject();
          getMeshes(moduleGroup).forEach((x) => {
            console.log("hello?");
            x.visible = false;
          });

          render();
        }
      })
    );
  },
});
