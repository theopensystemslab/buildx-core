import { createBasicScene } from "@/index";
import { dnasToModules, modulesToMatrix } from "@/layouts/ops";
import {
  elementsTask,
  houseTypesTask,
  materialsTask,
  modulesTask,
} from "@/tasks/airtables";
import { getBuildElement, getInitialThreeMaterial } from "@/tasks/defaultory";
import { getModelGeometriesTask } from "@/tasks/models";
import createModuleGroup, { isModuleGroup } from "@/three/objects/ModuleGroup";
import { A, O, T, TO } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
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
          console.log(outlinePass.selectedObjects);
        }
      }
    )
  );

  render();
}

const moduleGroupTaskOption = pipe(
  sequenceT(T.ApplicativePar)(
    houseTypesTask,
    modulesTask,
    elementsTask,
    materialsTask
  ),
  TO.fromTask,
  TO.chain(([houseTypes, buildModules, elements, materials]) =>
    pipe(
      houseTypes,
      A.head,
      TO.fromOption,
      TO.chain(({ systemId, description, dnas }) => {
        console.log(description);
        return pipe(
          dnas,
          dnasToModules({ systemId, buildModules }),
          modulesToMatrix,
          A.lookup(4),
          O.chain(A.lookup(1)),
          O.chain(A.head),
          TO.fromOption,
          TO.chain((buildModule) =>
            pipe(
              createModuleGroup({
                flip: false,
                getBuildElement: getBuildElement(elements),
                getIfcGeometries: getModelGeometriesTask,
                getInitialThreeMaterial: getInitialThreeMaterial(
                  elements,
                  materials
                ),
                gridGroupIndex: 0,
                module: buildModule,
                z: 0,
              }),
              TO.fromTask
            )
          )
        );
      })
    )
  )
);

moduleGroupTaskOption().then(
  O.map((moduleGroup) => {
    console.log({ moduleGroup });
    addObjectToScene(moduleGroup);
  })
);
