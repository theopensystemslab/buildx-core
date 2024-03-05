import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { produce } from "immer";
import { BufferGeometry, NormalBufferAttributes } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import createModuleGroup from "./three/objects/moduleGroup";
import "./style.css";
import { BuildElement, elementsQuery } from "./systemsData/elements";
import { BuildMaterial, materialsQuery } from "./systemsData/materials";
import { BuildModule, modulesQuery } from "./systemsData/modules";
import createBasicScene from "./three/createBasicScene";
import { getThreeMaterial } from "./three/materials/getThreeMaterial";
import { A, O, R, T, TO } from "./utils/functions";
import getSpeckleObject from "./utils/speckle/getSpeckleObject";
import speckleIfcParser from "./utils/speckle/speckleIfcParser";

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

const systemIds = ["speckle-skylark"];

const { addObjectToScene } = createBasicScene(canvas);

const elementsTask: T.Task<BuildElement[]> = () => elementsQuery({ systemIds });

const materialsTask: T.Task<BuildMaterial[]> = () =>
  materialsQuery({ systemIds });

const modulesTask: T.Task<BuildModule[]> = () => modulesQuery({ systemIds });

const modelsTask = pipe(
  modulesTask,
  T.chain(buildModules =>
    pipe(
      buildModules,
      A.traverse(T.ApplicativePar)(buildModule => async () => {
        const { speckleBranchUrl } = buildModule;
        const speckleObject = await getSpeckleObject(speckleBranchUrl);
        const ifcTaggedModelGeometries = pipe(
          speckleIfcParser.parse(speckleObject),
          A.reduce(
            {},
            (acc: { [e: string]: BufferGeometry[] }, { ifcTag, geometry }) => {
              return produce(acc, draft => {
                if (ifcTag in draft) draft[ifcTag].push(geometry);
                else draft[ifcTag] = [geometry];
              });
            }
          ),
          R.map(geoms => mergeBufferGeometries(geoms)),
          R.filter((bg: BufferGeometry | null): bg is BufferGeometry =>
            Boolean(bg)
          )
        );
        return [speckleBranchUrl, ifcTaggedModelGeometries] as const;
      }),
      // models ends up being an array of tuples
      // is there a nice way for models to be a Record instead here?
      T.map(models => ({
        models: models.reduce(
          (
            acc: Record<
              string,
              Record<string, BufferGeometry<NormalBufferAttributes>>
            >,
            [speckleBranchUrl, ifcTaggedGeometries]
          ) => ({
            ...acc,
            [speckleBranchUrl]: ifcTaggedGeometries,
          }),
          {}
        ),
        buildModules,
      }))
    )
  )
);

// TODO: const modelsTask = ???

// Use sequenceT to run the tasks concurrently
const allTasks = sequenceT(T.ApplicativePar)(
  elementsTask,
  materialsTask,
  modelsTask
);

pipe(
  allTasks,
  TO.fromTask,
  TO.chain(([elements, materials, { models, buildModules }]) =>
    pipe(
      buildModules,
      A.head,
      TO.fromOption,
      TO.chain(someModule =>
        TO.fromTask(() => {
          const getBuildElement = (ifcTag: string) => {
            const element = elements.find(
              x => x.systemId === someModule.systemId && x.ifcTag === ifcTag
            );

            if (typeof element === "undefined") throw new Error("no element");

            return element;
          };

          return createModuleGroup({
            flip: false,
            gridGroupIndex: 0,
            module: someModule,
            z: 0,
            getBuildElement,
            getIfcTaggedModelGeometries: speckleBranchUrl =>
              pipe(
                models,
                R.lookup(speckleBranchUrl),
                O.getOrElse(() => {
                  throw new Error("No model");
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  return undefined as any;
                })
              ),
            getInitialThreeMaterial: ifcTag => {
              const buildElement = getBuildElement(ifcTag);
              const defaultMaterialSpec = buildElement.defaultMaterial;
              const buildMaterial = materials.find(
                m =>
                  m.systemId === someModule.systemId &&
                  m.specification === defaultMaterialSpec
              );

              if (typeof buildMaterial === "undefined")
                throw new Error("no material");

              return getThreeMaterial(buildMaterial);
            },
          });
        })
      )
    )
  )
)().then(
  O.match(
    () => {
      console.log("none");
    },
    x => {
      console.log(x);
      addObjectToScene(x);
    }
  )
);
