import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
} from "three";

let offscreenCanvas;

// Listen for messages from the main script
// self.onmessage = function (event) {
//   if (event.data.type === "createCanvas") {
//     // Create an OffscreenCanvas with the specified width and height
//     offscreenCanvas = new OffscreenCanvas(event.data.width, event.data.height);
//     const ctx = offscreenCanvas.getContext(
//       "2d"
//     ) as OffscreenCanvasRenderingContext2D;

//     // Draw a rectangle on the OffscreenCanvas
//     ctx.fillStyle = "blue";
//     ctx.fillRect(50, 50, 200, 100);

//     // Convert the OffscreenCanvas to a Blob
//     offscreenCanvas.convertToBlob().then(function (blob) {
//       // Create a Blob URL from the Blob
//       const blobURL = URL.createObjectURL(blob);

//       // Send the Blob URL back to the main script
//       self.postMessage({ type: "canvasImage", blobURL: blobURL });
//     });
//   }
// };

let renderer;
let scene;
let camera;

// Listen for messages from the main script
self.onmessage = function (event) {
  if (event.data.type === "createCanvas") {
    // Create an OffscreenCanvas with the specified width and height
    offscreenCanvas = new OffscreenCanvas(event.data.width, event.data.height);

    // Set up the js scene, camera, and renderer
    scene = new Scene();
    camera = new PerspectiveCamera(
      75,
      event.data.width / event.data.height,
      0.1,
      1000
    );
    renderer = new WebGLRenderer({ canvas: offscreenCanvas });
    renderer.setSize(event.data.width, event.data.height);

    // Create a cube geometry and material
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new Mesh(geometry, material);
    scene.add(cube);

    // Position the camera
    camera.position.z = 5;

    // Render the scene
    renderer.render(scene, camera);

    // Convert the OffscreenCanvas to a Blob
    offscreenCanvas.convertToBlob().then(function (blob) {
      // Create a Blob URL from the Blob
      const blobURL = URL.createObjectURL(blob);

      // Send the Blob URL back to the main script
      self.postMessage({ type: "canvasImage", blobURL: blobURL });
    });
  }
};
