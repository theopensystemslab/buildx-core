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
    const processModule = async (selectedId: string) => {
      pipe(
        allModules,
        A.findFirst(({ id }) => id === selectedId),
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
      selectedModuleId: allModules[0].id, // Default to the first module's ID
    };

    // Add a dropdown to select a module
    gui
      .add(
        settings,
        "selectedModuleId",
        allModules.map((module) => module.id)
      )
      .name("Select Module")
      .onChange(processModule);

    processModule(settings.selectedModuleId);
  })
)();
