// Create a new Web Worker
const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

// Send a message to the worker to create the OffscreenCanvas and draw a rectangle
worker.postMessage({ type: "createCanvas", width: 400, height: 300 });

// Listen for messages from the worker
worker.onmessage = function (event) {
  if (event.data.type === "canvasImage") {
    // Create an image element and set the source to the received Blob URL
    const image = new Image();
    image.src = event.data.blobURL;
    document.body.appendChild(image);
  }
};
