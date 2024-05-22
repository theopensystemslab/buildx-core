import { cachedElementsTE, cachedHouseTypesTE } from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import { createBasicScene } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
import { outlineObject } from "@/three/effects/outline";
import { ColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { ElementBrush } from "@/three/objects/house/ElementGroup";
import { HouseGroup } from "@/three/objects/house/HouseGroup";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { ScopeElement } from "@/three/objects/types";
import { compareScopeElement } from "@/three/utils";
import { Side } from "@/three/utils/camera";
import { A, O, TE } from "@/utils/functions";
import { Gesture } from "@use-gesture/vanilla";
import { GUI } from "dat.gui";
import { flow, pipe } from "fp-ts/lib/function";
import { AxesHelper, Object3D, Raycaster, Vector2 } from "three";

const gui = new GUI({ hideable: false });

// Create folders for better organization
const houseTypeFolder = gui.addFolder("House Type");
let elementCategoriesFolder: GUI | null = null;
let cutsFolder: GUI | null = null; // Folder for cut modes

const { addObjectToScene, render, scene, camera, renderer } = createBasicScene({
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
        if (x instanceof HouseGroup) {
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
              window.addEventListener("keydown", (ev) => {
                switch (ev.key) {
                  case "c":
                    houseGroup.activeLayoutGroup.cutsManager.cycleClippingBrush();
                    break;
                  case "s":
                    houseGroup.layoutsManager.cycleSectionTypeLayout();
                    break;
                  case "w":
                    houseGroup.layoutsManager.cycleWindowTypeLayout();
                    break;
                }
                render();
              });

              const { elementsManager } = houseGroup;

              addObjectToScene(houseGroup);

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

                  elementCategoriesFolder?.open();
                  cutsFolder?.open();
                })
              )();
            })
          )();
        })
      );
    };

    const name = houseTypes[0].name;

    // Add the house type selection to its own folder
    houseTypeFolder.add({ name }, "name", options).onChange(go);
    houseTypeFolder.open();

    go(name);
  })
)();

const raycaster = new Raycaster();
const pointer = new Vector2();

// Variables to store previous values
let prevScopeElement: ScopeElement | null = null;
let prevSide: Side | null = null;

const selectFromEvent = (event: PointerEvent): void => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  let raycastObjects: Object3D[] = [];

  scene.traverse((node) => {
    if (node instanceof ColumnLayoutGroup && node.visible) {
      raycastObjects.push(node);
    }
  });

  const intersects = raycaster.intersectObjects(raycastObjects);

  pipe(
    intersects,
    A.head,
    O.map(({ object: nearestObject }) => {
      if (nearestObject instanceof ElementBrush) {
        const { layoutsManager } = nearestObject.houseGroup;

        const moduleGroup = nearestObject.moduleGroup;
        const scopeElement = nearestObject.scopeElement;
        const side = "LEFT";

        // Only refresh if scopeElement or side have changed
        if (
          (prevScopeElement &&
            !compareScopeElement(scopeElement, prevScopeElement)) ||
          side !== prevSide
        ) {
          layoutsManager.prepareAltWindowTypeLayouts(scopeElement, side);
          // layoutsManager.prepareAltSectionTypeLayouts();

          // Update previous values
          prevScopeElement = scopeElement;
          prevSide = side;
        }

        outlineObject(moduleGroup);
      }
    })
  );

  render();
};

new Gesture(renderer.domElement, {
  onClick: ({ event }) => selectFromEvent(event as PointerEvent),
});
