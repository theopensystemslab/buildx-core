import { systems } from "@/data/build-systems/systems";
import { cachedHouseTypesTE } from "@/data/build-systems/houseTypes";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import { HouseGroup } from "@/three/objects/house/HouseGroup";
import { TE } from "@/utils/functions";
import CameraControls from "camera-controls";
import * as dat from "dat.gui";
import { pipe } from "fp-ts/lib/function";
import * as THREE from "three";
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

// Initialize CameraControls with subset
CameraControls.install({ THREE: THREE });

// Create scene, camera, and renderer
const scene = new Scene();
const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new WebGLRenderer();

// Setup renderer and add to document
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting
const ambientLight = new AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create camera controls
const cameraControls = new CameraControls(camera, renderer.domElement);
const clock = new Clock();

// Set some reasonable initial camera position and target
cameraControls.setLookAt(10, 10, 10, 0, 0, 0, true);
cameraControls.dollyTo(15, true);

// Position camera further back
camera.position.z = 10;

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Animation loop
function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);

  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();

pipe(
  cachedHouseTypesTE,
  TE.map((houseTypes) => {
    // Initialize GUI
    const gui = new dat.GUI();
    const houseTypeFolder = gui.addFolder("House Type Selection");

    const firstHouseType = houseTypes[0];
    const firstSystem = systems.find((s) => s.id === firstHouseType.systemId);

    // Group house types by system ID
    const houseTypesBySystem = houseTypes.reduce((acc, houseType) => {
      if (!acc[houseType.systemId]) {
        acc[houseType.systemId] = [];
      }
      acc[houseType.systemId].push(houseType);
      return acc;
    }, {} as Record<string, typeof houseTypes>);

    // Get initial house types for the first system
    const initialSystemHouseTypes = firstSystem
      ? houseTypesBySystem[firstSystem.id] || []
      : [];

    const systemNameToId = systems.reduce((acc, system) => {
      acc[system.name] = system.id;
      return acc;
    }, {} as Record<string, string>);

    const systemNames = systems.map((s) => s.name);

    const params = {
      selectedSystem: firstSystem?.name ?? "",
      selectedHouseType: initialSystemHouseTypes[0]?.name ?? "",
    };

    // System selection dropdown
    houseTypeFolder
      .add(params, "selectedSystem", systemNames)
      .onChange((systemName: string) => {
        const systemId = systemNameToId[systemName];
        const systemHouseTypes = houseTypesBySystem[systemId] || [];

        // Update house type dropdown
        const oldControl = houseTypeFolder.__controllers.find(
          (c: { property: string }) => c.property === "selectedHouseType"
        );
        if (oldControl) {
          houseTypeFolder.remove(oldControl);
        }

        const newControl = houseTypeFolder
          .add(
            params,
            "selectedHouseType",
            systemHouseTypes.map((h) => h.name)
          )
          .onChange((houseName: string) => {
            const selectedHouseType = houseTypes.find(
              (h) => h.name === houseName && h.systemId === systemId
            );

            if (selectedHouseType) {
              // Clear existing house groups
              scene.remove(
                ...scene.children.filter((x) => x instanceof HouseGroup)
              );

              // Add new house group
              pipe(
                createHouseGroupTE({
                  systemId: selectedHouseType.systemId,
                  dnas: selectedHouseType.dnas,
                  houseTypeId: selectedHouseType.id,
                }),
                TE.map((houseGroup) => {
                  scene.add(houseGroup);
                })
              )();
            }
          });

        // Set initial value
        const firstName = systemHouseTypes[0]?.name || "";
        params.selectedHouseType = firstName;
        newControl.setValue(firstName);
      });

    // Add initial house type dropdown
    houseTypeFolder
      .add(
        params,
        "selectedHouseType",
        initialSystemHouseTypes.map((h) => h.name)
      )
      .onChange((houseName: string) => {
        const currentSystemId = systemNameToId[params.selectedSystem];
        const selectedHouseType = houseTypes.find(
          (h) => h.name === houseName && h.systemId === currentSystemId
        );

        if (selectedHouseType) {
          scene.remove(
            ...scene.children.filter((x) => x instanceof HouseGroup)
          );

          pipe(
            createHouseGroupTE({
              systemId: selectedHouseType.systemId,
              dnas: selectedHouseType.dnas,
              houseTypeId: selectedHouseType.id,
            }),
            TE.map((houseGroup) => {
              scene.add(houseGroup);
            })
          )();
        }
      });

    houseTypeFolder.open();

    // Load initial house type
    pipe(
      createHouseGroupTE({
        systemId: firstHouseType.systemId,
        dnas: firstHouseType.dnas,
        houseTypeId: firstHouseType.id,
      }),
      TE.map((houseGroup) => {
        scene.add(houseGroup);
      })
    )();

    return houseTypes;
  })
)();
