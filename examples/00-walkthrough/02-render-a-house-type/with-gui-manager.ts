import {
  CachedHouseType,
  cachedHouseTypesTE,
} from "@/data/build-systems/houseTypes";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import { HouseGroup } from "@/three/objects/house/HouseGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { GUIConfig } from "../01-render-a-module/further/GUIManager";
import SceneWithGui from "../01-render-a-module/further/SceneWithGui";

// Create scene with integrated GUI management
const scene = new SceneWithGui();

// Create house-type-specific configuration
const houseTypeConfig: GUIConfig<CachedHouseType> = {
  items: [], // Will be populated with house types
  folderName: "House Type Selection",
  groupBySystem: (houseTypes) => {
    return houseTypes.reduce((acc, houseType) => {
      if (!acc[houseType.systemId]) {
        acc[houseType.systemId] = [];
      }
      acc[houseType.systemId].push(houseType);
      return acc;
    }, {} as Record<string, typeof houseTypes>);
  },
  getSystemId: (houseType) => houseType.systemId,
  getDisplayName: (houseType) => houseType.name,
  clearScene: (scene) => {
    scene.remove(...scene.children.filter((x) => x instanceof HouseGroup));
  },
  loadItem: (scene, houseType) => {
    pipe(
      createHouseGroupTE({
        systemId: houseType.systemId,
        dnas: houseType.dnas,
        houseTypeId: houseType.id,
      }),
      TE.map((houseGroup) => {
        scene.add(houseGroup);
      })
    )();
  },
};

// Load and initialize GUI with house types
pipe(
  cachedHouseTypesTE,
  TE.map((houseTypes) => {
    houseTypeConfig.items = houseTypes;
    scene.initializeGUI(houseTypeConfig);
    return houseTypes;
  })
)();

scene.animate();
