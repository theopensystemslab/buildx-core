import { BuildElement, elementsQuery } from "@/systemsData/elements";
import { BuildMaterial, materialsQuery } from "@/systemsData/materials";
import { BuildModule, modulesQuery } from "@/systemsData/modules";
import { A, O, R, T } from "@/utils/functions";
import getSpeckleObject from "@/utils/speckle/getSpeckleObject";
import speckleIfcParser from "@/utils/speckle/speckleIfcParser";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { produce } from "immer";
import { BufferGeometry, Material, NormalBufferAttributes } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { getThreeMaterial } from "../three/materials/getThreeMaterial";
import "./style.css";

const systemIds = ["speckle-skylark"];

export type DefaultGetters = {
  getIfcGeometries: (
    speckleBranchUrl: string
  ) => Promise<Record<string, BufferGeometry>>;
  getBuildElement: (x: { systemId: string; ifcTag: string }) => BuildElement;
  getInitialThreeMaterial: (x: {
    systemId: string;
    ifcTag: string;
  }) => Material;
};

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

// Use sequenceT to run the tasks concurrently
const allTasks = sequenceT(T.ApplicativePar)(
  elementsTask,
  materialsTask,
  modelsTask
);

const getDefaultGetters: T.Task<DefaultGetters> = pipe(
  allTasks,
  T.map(([elements, materials, { models }]) => {
    const getBuildElement = ({
      systemId,
      ifcTag,
    }: {
      systemId: string;
      ifcTag: string;
    }) => {
      const element = elements.find(
        x => x.systemId === systemId && x.ifcTag === ifcTag
      );

      if (typeof element === "undefined") throw new Error("no element");

      return element;
    };

    const getIfcGeometries = (speckleBranchUrl: string) =>
      pipe(
        models,
        R.lookup(speckleBranchUrl),
        O.getOrElse(() => {
          throw new Error("No model");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return undefined as any;
        })
      );

    const getInitialThreeMaterial = ({
      systemId,
      ifcTag,
    }: {
      systemId: string;
      ifcTag: string;
    }) => {
      const buildElement = getBuildElement({ systemId, ifcTag });
      const defaultMaterialSpec = buildElement.defaultMaterial;
      const buildMaterial = materials.find(
        m => m.systemId === systemId && m.specification === defaultMaterialSpec
      );

      if (typeof buildMaterial === "undefined") throw new Error("no material");

      return getThreeMaterial(buildMaterial);
    };

    return {
      getBuildElement,
      getIfcGeometries,
      getInitialThreeMaterial,
    };
  })
);

export default getDefaultGetters;
