import { createBasicScene } from "@/index";
import { createRow, modulesToMatrix } from "@/layouts/ops";
import defaultoryTask from "@/tasks/defaultory";
import { createGridGroup } from "@/three/objects/GridGroup";
import { A, O, T, TO, pipeLog } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { Object3D, Raycaster, Vector2, WebGLRenderer } from "three";
import { EffectComposer, OutlinePass, RenderPass } from "three-stdlib";

const renderer = new WebGLRenderer();

const composer = new EffectComposer(renderer);

const { addObjectToScene, scene, camera } = createBasicScene();

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outlinePass = new OutlinePass(
  new Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);

composer.addPass(outlinePass);

renderer.domElement.addEventListener("pointermove", onPointerMove);

const raycaster = new Raycaster();

let selectedObjects: Object3D[] = [];

const mouse = new Vector2();

function onPointerMove(event: any) {
  if (event.isPrimary === false) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  checkIntersection();
}

function addSelectedObject(object: Object3D) {
  selectedObjects = [];
  selectedObjects.push(object);
}

function checkIntersection() {
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(scene, true);

  if (intersects.length > 0) {
    console.log(intersects.length);
    const selectedObject = intersects[0].object;
    addSelectedObject(selectedObject);
    outlinePass.selectedObjects = selectedObjects;
  } else {
    // outlinePass.selectedObjects = [];
  }
}

pipe(
  // sequenceT(T.ApplicativePar)(houseTypesTask, modulesTask),
  defaultoryTask,
  T.map(
    ({
      houseTypes,
      buildModules,
      getBuildElement,
      getIfcGeometries,
      getInitialThreeMaterial,
    }) => {
      pipe(
        houseTypes,
        // A.dropLeft(1),
        pipeLog,
        A.head,
        O.map(({ systemId, dnas }) => {
          // create layout
          pipe(
            dnas,
            A.filterMap((dna) =>
              pipe(
                buildModules,
                A.findFirst((x) => x.systemId === systemId && dna === x.dna)
              )
            ),
            modulesToMatrix,
            A.lookup(4),
            O.chain(A.lookup(0)),
            pipeLog,
            TO.fromOption,
            TO.chain(
              flow(createRow, (row) =>
                TO.fromTask(() =>
                  createGridGroup({
                    ...row,
                    flip: false,
                    getBuildElement,
                    getIfcGeometries,
                    getInitialThreeMaterial,
                    levelIndex: 0,
                    y: 0,
                  }).then((gridGroup) => {
                    console.log({ gridGroup });
                    addObjectToScene(gridGroup);
                  })
                )
              )
            )
          )();
        })
      );
    }
  )
)();
