import { cachedHouseTypesTE, createBasicScene } from "@/index";
import houseGroupTE from "@/tasks/houseGroupTE";
import { outlineObject } from "@/three/effects/outline";
import { ElementBrush } from "@/three/objects/house/ElementGroup";
import { ScopeElement } from "@/three/objects/types";
import { compareScopeElement } from "@/three/utils";
import { Side } from "@/three/utils/camera";
import { A, O, TE } from "@/utils/functions";
import { Gesture } from "@use-gesture/vanilla";
import { flow, pipe } from "fp-ts/lib/function";
import { Raycaster, Vector2 } from "three";

const { scene, camera, render, addObjectToScene, renderer } =
  createBasicScene();

const raycaster = new Raycaster();
const pointer = new Vector2();

// Variables to store previous values
let prevScopeElement: ScopeElement | null = null;
let prevSide: Side | null = null;

const foo = (event: PointerEvent): void => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  pipe(
    intersects,
    A.head,
    O.map(({ object: nearestObject }) => {
      if (nearestObject instanceof ElementBrush) {
        const { layoutsManager } = nearestObject.houseGroup;

        const moduleGroup = nearestObject.moduleGroup;
        const scopeElement = nearestObject.scopeElement;
        const side = "LEFT";

        // Only refresh if scopeElement or side have changed
        if (
          (prevScopeElement &&
            !compareScopeElement(scopeElement, prevScopeElement)) ||
          side !== prevSide
        ) {
          layoutsManager.refreshAltWindowTypeLayouts(scopeElement, side);

          // Update previous values
          prevScopeElement = scopeElement;
          prevSide = side;
        }

        outlineObject(moduleGroup);
      }
    })
  );

  render();
};

new Gesture(renderer.domElement, {
  onClick: ({ event }) => foo(event as PointerEvent),
});

pipe(
  cachedHouseTypesTE,
  TE.chain(
    flow(
      A.lookup(2),
      TE.fromOption(() => Error("bah"))
    )
  ),
  TE.chain(({ id: houseTypeId, dnas, systemId, name: friendlyName }) =>
    houseGroupTE({
      systemId,
      houseTypeId,
      dnas,
      houseId: houseTypeId,
      friendlyName,
    })
  ),
  TE.map((houseGroup) => {
    addObjectToScene(houseGroup);
  })
)();
