import { createBasicScene } from "@/index";
import { createRow, modulesToMatrix } from "@/layouts/ops";
import defaultoryTask from "@/tasks/defaultory";
import { createGridGroup } from "@/three/objects/GridGroup";
import { A, O, T, TO, pipeLog } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";

const { addObjectToScene } = createBasicScene();

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
