import { BuildElement } from "@/systemsData/elements";
import { O, R, T } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Material } from "three";
import { getThreeMaterial } from "../three/materials/getThreeMaterial";
import { elementsTask, houseTypesTask, materialsTask } from "./airtables";
import modelsTask from "./models";

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

// Use sequenceT to run the tasks concurrently
const allTasks = sequenceT(T.ApplicativePar)(
  elementsTask,
  materialsTask,
  modelsTask,
  houseTypesTask
);

const defaultoryTask = pipe(
  allTasks,
  T.map(([elements, materials, { models, buildModules }, houseTypes]) => {
    const getBuildElement = ({
      systemId,
      ifcTag,
    }: {
      systemId: string;
      ifcTag: string;
    }) => {
      const element = elements.find(
        (x) => x.systemId === systemId && x.ifcTag === ifcTag
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
        (m) =>
          m.systemId === systemId && m.specification === defaultMaterialSpec
      );

      if (typeof buildMaterial === "undefined") throw new Error("no material");

      return getThreeMaterial(buildMaterial);
    };

    return {
      elements,
      materials,
      buildModules,
      models,
      houseTypes,
      getBuildElement,
      getIfcGeometries,
      getInitialThreeMaterial,
    };
  })
);

export default defaultoryTask;
