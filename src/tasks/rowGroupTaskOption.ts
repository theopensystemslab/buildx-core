import { createRowLayout, dnasToModules, modulesToRows } from "@/layouts/ops";
import {
  elementsTask,
  houseTypesTask,
  materialsTask,
  modulesTask,
} from "@/tasks/airtables";
import { getBuildElement, getInitialThreeMaterial } from "@/tasks/defaultory";
import { getModelGeometriesTask } from "@/tasks/models";
import { createGridGroup } from "@/three/objects/house/GridGroup";
import { A, T, TO } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const rowGroupTaskOption = ({
  houseTypeIndex,
  levelIndex,
}: {
  houseTypeIndex: number;
  levelIndex: number;
}) =>
  pipe(
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
        A.lookup(houseTypeIndex),
        TO.fromOption,
        TO.chain(({ systemId, dnas }) =>
          pipe(
            dnas,
            dnasToModules({ systemId, buildModules }),
            modulesToRows,
            createRowLayout,
            (layout) =>
              pipe(
                layout,
                A.lookup(levelIndex),
                TO.fromOption,
                TO.chain((row) =>
                  TO.fromTask(
                    createGridGroup({
                      ...row,
                      getBuildElement: getBuildElement(elements),
                      getIfcGeometries: getModelGeometriesTask,
                      getInitialThreeMaterial: getInitialThreeMaterial(
                        elements,
                        materials
                      ),
                      endColumn: false,
                    })
                  )
                )
              )
          )
        )
      )
    )
  );

export default rowGroupTaskOption;
