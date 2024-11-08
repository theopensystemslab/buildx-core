import SceneWithGui from "./SceneWithGui";

// Create and initialize the scene
const scene = new SceneWithGui();

// Start the animation loop
scene.animate();

// Clean up on window unload
window.addEventListener("unload", () => {
  scene.dispose();
});
