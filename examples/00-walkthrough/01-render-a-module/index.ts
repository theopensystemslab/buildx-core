import { BuildModule } from "@/data/build-systems/modules";
import { systems } from "@/data/build-systems/systems";
import { cachedModulesTE } from "@/index";
import {
  defaultModuleGroupCreator,
  ModuleGroup,
} from "@/three/objects/house/ModuleGroup";
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
  cachedModulesTE,
  TE.map((modules) => {
    // Initialize GUI here
    const gui = new dat.GUI();
    const systemFolder = gui.addFolder("Module Selection");

    const firstModule = modules[0];
    const firstSystem = systems.find((s) => s.id === firstModule.systemId);

    // Group modules by system ID
    const modulesBySystem = modules.reduce((acc, module) => {
      if (module.systemId) {
        if (!acc[module.systemId]) {
          acc[module.systemId] = [];
        }
        acc[module.systemId].push(module);
      }
      return acc;
    }, {} as Record<string, BuildModule[]>);

    // Get initial modules for the first system
    const initialSystemModules = firstSystem
      ? modulesBySystem[firstSystem.id] || []
      : [];

    // Create a mapping of system names (for display) to system IDs
    const systemNameToId = systems.reduce((acc, system) => {
      acc[system.name] = system.id;
      return acc;
    }, {} as Record<string, string>);

    // Get system names for the dropdown
    const systemNames = systems.map((s: { name: string }) => s.name);

    const params = {
      selectedSystem: firstSystem?.name ?? "",
      selectedDna: initialSystemModules[0]?.dna ?? "",
    };

    // System selection dropdown (using display names)
    systemFolder
      .add(params, "selectedSystem", systemNames)
      .onChange((systemName: string) => {
        const systemId = systemNameToId[systemName];
        const systemModules = modulesBySystem[systemId] || [];

        // Remove old DNA control
        const oldDnaControl = systemFolder.__controllers.find(
          (c: { property: string }) => c.property === "selectedDna"
        );
        if (oldDnaControl) {
          systemFolder.remove(oldDnaControl);
        }

        // Create new DNA control
        const newDnaControl = systemFolder
          .add(
            params,
            "selectedDna",
            systemModules.map((m: BuildModule) => m.dna)
          )
          .onChange((dna: string) => {
            const currentSystemId = systemNameToId[params.selectedSystem];
            const selectedModule = modules.find(
              (m) => m.dna === dna && m.systemId === currentSystemId
            );

            if (selectedModule) {
              // Clear existing modules
              scene.remove(
                ...scene.children.filter((x) => x instanceof ModuleGroup)
              );

              // Add new module
              pipe(
                defaultModuleGroupCreator({
                  buildModule: selectedModule,
                }),
                TE.map((moduleGroup) => {
                  (moduleGroup as any).__isModuleGroup = true;
                  scene.add(moduleGroup);
                })
              )();
            }
          });

        // Set initial value and trigger change
        const firstDna = systemModules[0]?.dna || "";
        params.selectedDna = firstDna;
        newDnaControl.setValue(firstDna); // This should trigger the onChange handler
      });

    // Add initial DNA control
    systemFolder
      .add(
        params,
        "selectedDna",
        initialSystemModules.map((m: BuildModule) => m.dna)
      )
      .onChange((dna: string) => {
        const currentSystemId = systemNameToId[params.selectedSystem];
        const selectedModule = modules.find(
          (m) => m.dna === dna && m.systemId === currentSystemId
        );

        if (selectedModule) {
          scene.remove(
            ...scene.children.filter((x) => x instanceof ModuleGroup)
          );

          pipe(
            defaultModuleGroupCreator({
              buildModule: selectedModule,
            }),
            TE.map((moduleGroup) => {
              (moduleGroup as any).__isModuleGroup = true;
              scene.add(moduleGroup);
            })
          )();
        }
      });

    systemFolder.open();

    // Load initial module
    pipe(
      defaultModuleGroupCreator({
        buildModule: firstModule,
      }),
      TE.map((moduleGroup) => {
        (moduleGroup as any).__isModuleGroup = true;
        scene.add(moduleGroup);
      })
    )();

    return modules;
  })
)();
