import {
  createColumnLayout,
  dnasToModules,
  modulesToMatrix,
} from "@/layouts/ops";
import {
  elementsTask,
  houseTypesTask,
  materialsTask,
  modulesTask,
} from "@/tasks/airtables";
import { getBuildElement, getInitialThreeMaterial } from "@/tasks/defaultory";
import { getModelGeometriesTask } from "@/tasks/models";
import { createColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { A, T, TO } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

const columnLayoutTaskOption = ({
  houseTypeIndex,
}: {
  houseTypeIndex: number;
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
            createColumnLayout,
            (layout) =>
              pipe(
                createColumnLayoutGroup({
                  layout,
                  dnas,
                  systemId,
                  getBuildElement: getBuildElement(elements),
                  getIfcGeometries: getModelGeometriesTask,
                  getInitialThreeMaterial: getInitialThreeMaterial(
                    elements,
                    materials
                  ),
                  vanillaColumnGetter: () => T.of(undefined as any),
                }),
                TO.fromTask
              )
          )
        )
      )
    )
  );

export default columnLayoutTaskOption;
