import { createBasicScene } from "@/index";
import { createRow, modulesToMatrix } from "@/layouts/ops";
import defaultoryTask from "@/tasks/defaultory";
import { createGridGroup } from "@/three/objects/GridGroup";
import { isModuleGroup } from "@/three/objects/ModuleGroup";
import { A, O, T, TO, pipeLog } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import { Raycaster, Vector2 } from "three";

const { addObjectToScene, scene, camera, outlinePass, renderer, render } =
  createBasicScene();

renderer.domElement.addEventListener("pointermove", onPointerMove);

const raycaster = new Raycaster();

const mouse = new Vector2();

function onPointerMove(event: any) {
  if (event.isPrimary === false) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  checkIntersection();
}

function checkIntersection() {
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(scene, true);

  pipe(
    intersects,
    A.head,
    O.match(
      () => {
        outlinePass.selectedObjects = [];
      },
      (intersect) => {
        const object = intersect.object;
        if (object.parent && isModuleGroup(object.parent)) {
          outlinePass.selectedObjects = object.parent.children;
        }
      }
    )
  );

  render();
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
