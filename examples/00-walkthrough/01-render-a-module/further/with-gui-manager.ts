import { BuildModule } from "@/data/build-systems/modules";
import { cachedModulesTE } from "@/index";
import {
  defaultModuleGroupCreator,
  ModuleGroup,
} from "@/three/objects/house/ModuleGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { GUIConfig } from "./GUIManager";
import SceneWithGui from "./SceneWithGui";

// Create scene, camera, and renderer
const scene = new SceneWithGui();
scene.animate();

// Create module-specific configuration
const moduleConfig: GUIConfig<BuildModule> = {
  items: [], // Will be populated with modules
  folderName: "Module Selection",
  groupBySystem: (modules) => {
    return modules.reduce((acc, module) => {
      if (module.systemId) {
        if (!acc[module.systemId]) {
          acc[module.systemId] = [];
        }
        acc[module.systemId].push(module);
      }
      return acc;
    }, {} as Record<string, BuildModule[]>);
  },
  getSystemId: (module) => module.systemId,
  getDisplayName: (module) => module.dna,
  clearScene: (scene) => {
    scene.remove(...scene.children.filter((x) => x instanceof ModuleGroup));
  },
  loadItem: (scene, module) => {
    pipe(
      defaultModuleGroupCreator({ buildModule: module }),
      TE.map((moduleGroup) => {
        (moduleGroup as any).__isModuleGroup = true;
        scene.add(moduleGroup);
      })
    )();
  },
};

// Load and initialize GUI with modules
pipe(
  cachedModulesTE,
  TE.map((modules) => {
    moduleConfig.items = modules;
    scene.initializeGUI(moduleConfig);
    return modules;
  })
)();

scene.animate();
