import { createBasicScene } from "@/index";
import { elementsTask, materialsTask, modulesTask } from "@/tasks/airtables";
import { getBuildElement, getInitialThreeMaterial } from "@/tasks/defaultory";
import { getModelGeometriesTask } from "@/tasks/models";
import createModuleGroup, { ModuleGroup } from "@/three/objects/ModuleGroup";
import { A, O, T } from "@/utils/functions";
import { GUI } from "dat.gui";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import {
  AxesHelper,
  BoxGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Vector3,
} from "three";
import { Brush } from "three-bvh-csg";

const { addObjectToScene, scene, render } = createBasicScene();

addObjectToScene(new AxesHelper());

const gui = new GUI();

let activeModuleGroup: ModuleGroup | null = null;

pipe(
  sequenceT(T.ApplicativePar)(modulesTask, elementsTask, materialsTask),
  T.map(([allModules, allElements, allMaterials]) => {
    // module processor
    const processModule = async (selectedDna: string) => {
      pipe(
        allModules,
        A.findFirst(({ dna }) => dna === selectedDna),
        O.map(async (buildModule) => {
          const nextModuleGroup = await createModuleGroup({
            buildModule,
            getBuildElement: getBuildElement(allElements),
            getIfcGeometries: () =>
              getModelGeometriesTask(buildModule.speckleBranchUrl),
            getInitialThreeMaterial: getInitialThreeMaterial(
              allElements,
              allMaterials
            ),
            gridGroupIndex: 0,
            z: 0,
          })();

          if (activeModuleGroup) {
            scene.remove(activeModuleGroup);
            activeModuleGroup = null;
          }
          addObjectToScene(nextModuleGroup);
          activeModuleGroup = nextModuleGroup;
        })
      );
    };

    // GUI setup
    const settings = {
      dna: allModules[5].dna, // Default to the first module's dna
    };

    const options = allModules.map((module) => module.dna);

    // Add a dropdown to select a module
    gui
      .add(settings, "dna", options)
      .name("Select Module")
      .onChange(processModule);

    processModule(settings.dna);

    function cycleOptions(direction: "prev" | "next") {
      let currentIndex = options.indexOf(settings.dna);
      if (direction === "next") {
        currentIndex = (currentIndex + 1) % options.length;
      } else if (direction === "prev") {
        currentIndex = (currentIndex - 1 + options.length) % options.length;
      }
      settings.dna = options[currentIndex];
      gui.updateDisplay();
      processModule(settings.dna);
    }

    const C = 10;

    const clippingBrush = new Brush(
      new BoxGeometry(10, C, 10),
      new MeshBasicMaterial({ color: "white", side: DoubleSide })
    );
    clippingBrush.position.set(
      0,
      C / 2 + 0.8,
      0
      // C / 2
    );
    clippingBrush.visible = false;
    clippingBrush.updateMatrixWorld();

    let clipped = false;

    function clipModuleGroup() {
      if (!activeModuleGroup) return;

      if (clipped) {
        activeModuleGroup.destroyClippedBrushes();
        activeModuleGroup.showElementBrushes();
      } else {
        activeModuleGroup.createLevelCutBrushes(clippingBrush);
        activeModuleGroup.showClippedBrushes();
      }

      clipped = !clipped;
    }

    const zv = new Vector3(0, 0, 1);

    function moveModuleGroup() {
      if (!activeModuleGroup) return;

      activeModuleGroup.position.add(zv);
      activeModuleGroup.updateMatrixWorld();
    }

    // Extend your existing keydown event listener
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "j":
          cycleOptions("prev");
          break;
        case "k":
          cycleOptions("next");
          break;
        case "c": // Step 3: Binding the 'c' key to call methods on the current module group
          clipModuleGroup();
          break;
        case "t":
          moveModuleGroup();
          break;
        // Include other cases if needed
      }
      render();
    });
  })
)();
