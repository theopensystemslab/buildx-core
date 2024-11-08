import { pipe } from "fp-ts/lib/function";
import { TE } from "@/utils/functions";
import { cachedHouseTypesTE } from "@/data/build-systems/houseTypes";
import SceneWithGui from "./SceneWithGui";
import { houseTypeConfig } from "./houseTypeConfig";

// Create and initialize the scene
const scene = new SceneWithGui();

// Load and initialize GUI with house types
pipe(
  cachedHouseTypesTE,
  TE.map((houseTypes) => {
    houseTypeConfig.items = houseTypes;
    scene.initializeGUI(houseTypeConfig);
    return houseTypes;
  })
)();

// Start the animation loop
scene.animate();

// Clean up on window unload
window.addEventListener("unload", () => {
  scene.dispose();
});
