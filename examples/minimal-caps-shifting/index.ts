import { createBasicScene } from "@/index";
import { elementsTask, materialsTask, modulesTask } from "@/tasks/airtables";
import { getBuildElement, getInitialThreeMaterial } from "@/tasks/defaultory";
import { getModelGeometriesTask } from "@/tasks/models";
import createModuleGroup, { ModuleGroup } from "@/three/objects/ModuleGroup";
import { A, O, T } from "@/utils/functions";
import { GUI } from "dat.gui";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { AxesHelper } from "three";

const { addObjectToScene, scene } = createBasicScene();

addObjectToScene(new AxesHelper());

// GUI setup
const gui = new GUI();

let prevModuleGroup: ModuleGroup | null = null;

pipe(
  sequenceT(T.ApplicativePar)(modulesTask, elementsTask, materialsTask),
  T.map(([allModules, allElements, allMaterials]) => {
    console.log("hello?", { allElements });
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

          if (prevModuleGroup) {
            scene.remove(prevModuleGroup);
            prevModuleGroup = null;
          }
          addObjectToScene(nextModuleGroup);
          prevModuleGroup = nextModuleGroup;
        })
      );
    };

    // Create an object to hold the selected module ID
    const settings = {
      dna: allModules[0].dna, // Default to the first module's ID
    };

    const options = allModules.map((module) => module.dna);

    // Add a dropdown to select a module
    gui.add(settings, "dna").name("Select Module").onChange(processModule);

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

    // Listen for keydown events
    document.addEventListener("keydown", (event) => {
      if (event.key === "j") {
        cycleOptions("prev");
      } else if (event.key === "k") {
        cycleOptions("next");
      }
    });
  })
)();
