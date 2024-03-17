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
import {
  AxesHelper,
  BoxGeometry,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
} from "three";
import { Evaluator, Operation, SUBTRACTION } from "three-bvh-csg";

const { addObjectToScene, scene, camera, outlinePass, renderer, render } =
  createBasicScene();

addObjectToScene(new AxesHelper());

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
      TO.chain(({ systemId, dnas }) =>
        pipe(
          dnas,
          dnasToModules({ systemId, buildModules }),
          modulesToMatrix,
          A.lookup(3),
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
                buildModule: buildModule,
                z: 0,
              }),
              TO.fromTask
            )
          )
        )
      )
    )
  )
);

const evaluator = new Evaluator();

moduleGroupTaskOption().then(
  O.map((moduleGroup) => {
    const { width, length, height } = moduleGroup.userData;

    const rootOp = new Operation(
      new BoxGeometry(width, height, length),
      new MeshBasicMaterial({ color: "white", wireframe: true, visible: false })
    );
    // @ts-ignore
    rootOp.operation = undefined;

    const levelCutOp = new Operation(
      new BoxGeometry(width, height / 2, length),
      new MeshBasicMaterial({ color: "tomato", visible: true })
    );
    levelCutOp.visible = false;
    levelCutOp.position.setY(height / 4);
    // @ts-ignore
    levelCutOp.operation = SUBTRACTION;

    rootOp.add(levelCutOp);
    rootOp.add(moduleGroup);
    moduleGroup.position.setY(-height / 2);

    console.log({ rootOp, levelCutOp, moduleGroup });

    addObjectToScene(rootOp);

    window.addEventListener("keydown", (event) => {
      // Spacebar or Enter key
      if (event.key === " " || event.key === "Enter") {
        const foo = evaluator.evaluateHierarchy(rootOp);
        console.log(foo);
        rootOp.removeFromParent();
        addObjectToScene(foo);

        // // Perform the subtraction operation between the brush and the clipping brush
        // const result = evaluator.evaluate(brush, clippingBrush, SUBTRACTION);
      }
    });
  })
);
