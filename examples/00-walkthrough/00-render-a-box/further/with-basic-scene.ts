import { BoxGeometry, Mesh, MeshPhongMaterial } from "three";
import { BasicScene } from "./BasicScene";

// Create an instance of BasicScene
const scene = new BasicScene();

// Add a simple cube to test if rendering works
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshPhongMaterial({ color: 0x00ff00 });
const cube = new Mesh(geometry, material);
scene.add(cube);

// Start the animation loop
scene.animate();

// Optional: Animate the cube
function animateCube() {
  cube.rotation.x += 0.01;
  requestAnimationFrame(animateCube);
}

animateCube();
