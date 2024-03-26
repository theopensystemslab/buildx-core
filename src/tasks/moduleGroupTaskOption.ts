import { dnasToModules, modulesToMatrix } from "@/layouts/ops";
import {
  elementsTask,
  houseTypesTask,
  materialsTask,
  modulesTask,
} from "@/tasks/airtables";
import { getBuildElement, getInitialThreeMaterial } from "@/tasks/defaultory";
import { getModelGeometriesTask } from "@/tasks/models";
import createModuleGroup from "@/three/objects/house/ModuleGroup";
import { A, O, T, TO } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const moduleGroupTaskOption = ({
  houseTypeIndex,
  columnIndex,
  levelIndex,
  gridGroupIndex,
}: {
  houseTypeIndex: number;
  columnIndex: number;
  levelIndex: number;
  gridGroupIndex: number;
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
            modulesToMatrix,
            A.lookup(columnIndex),
            O.chain(A.lookup(levelIndex)),
            O.chain(A.lookup(gridGroupIndex)),
            TO.fromOption,
            TO.chain((buildModule) =>
              pipe(
                createModuleGroup({
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

export default moduleGroupTaskOption;
