import { cachedModulesTE } from "@/build-systems/cache";
import { allSystemIds } from "@/build-systems/remote/systems";
import { createBasicScene } from "@/index";
import {
  ModuleGroup,
  defaultModuleGroupCreator,
} from "@/three/objects/house/ModuleGroup";
import { A, TE } from "@/utils/functions";
import { GUI } from "dat.gui";
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

const systemId = allSystemIds[0];

pipe(
  cachedModulesTE,
  TE.map((allModules) => {
    // module processor
    const processModule = (selectedDna: string) =>
      pipe(
        allModules,
        A.findFirst((x) => x.systemId === systemId && x.dna === selectedDna),
        TE.fromOption(() =>
          Error(`BuildModule ${selectedDna} not found in ${systemId}`)
        ),
        TE.flatMap((buildModule) =>
          pipe(
            defaultModuleGroupCreator({
              buildModule,
              gridGroupIndex: 0,
              z: 0,
              flip: true,
            }),
            TE.map((nextModuleGroup) => {
              if (activeModuleGroup) {
                scene.remove(activeModuleGroup);
                activeModuleGroup = null;
              }
              addObjectToScene(nextModuleGroup);
              activeModuleGroup = nextModuleGroup;

              return nextModuleGroup;
            })
          )
        )
      )();

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
        activeModuleGroup.createClippedBrushes(clippingBrush);
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
