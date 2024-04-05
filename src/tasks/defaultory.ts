import {
  cachedElementsTE,
  cachedHouseTypesTE,
  cachedMaterialsTE,
} from "@/build-systems/cache";
import { BuildElement } from "@/build-systems/remote/elements";
import { BuildMaterial } from "@/build-systems/remote/materials";
import { BuildModel } from "@/build-systems/remote/models";
import { O, R, T, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { Material } from "three";
import { getThreeMaterial } from "../three/materials/getThreeMaterial";
import modelsTask from "./models";

// export type DefaultGetters = {
//   getBuildModel: (speckleBranchUrl: string) => TE.TaskEither<Error, BuildModel>;
//   getBuildElement: (x: {
//     systemId: string;
//     ifcTag: string;
//   }) => TE.TaskEither<Error, BuildElement>;
//   getInitialThreeMaterial: (x: {
//     systemId: string;
//     ifcTag: string;
//   }) => TE.TaskEither<Error, Material>;
// };

// Use sequenceT to run the tasks concurrently
const allTasks = sequenceT(TE.ApplicativePar)(
  cachedElementsTE,
  cachedMaterialsTE,
  modelsTask,
  cachedHouseTypesTE
);

export const getBuildElement = (allElements: BuildElement[]) => {
  return ({ systemId, ifcTag }: { systemId: string; ifcTag: string }) => {
    const element = allElements.find(
      (x) => x.systemId === systemId && x.ifcTag === ifcTag
    );

    if (typeof element === "undefined") throw new Error("no element");

    return TE.of(element);
  };
};

export const getInitialThreeMaterial =
  (allElements: BuildElement[], allMaterials: BuildMaterial[]) =>
  ({ systemId, ifcTag }: { systemId: string; ifcTag: string }) => {
    return pipe(
      getBuildElement(allElements)({ systemId, ifcTag }),
      TE.map((buildElement) => {
        const defaultMaterialSpec = buildElement.defaultMaterial;
        const buildMaterial = allMaterials.find(
          (m) =>
            m.systemId === systemId && m.specification === defaultMaterialSpec
        );

        if (typeof buildMaterial === "undefined")
          throw new Error("no material");

        return getThreeMaterial(buildMaterial);
      })
    );
  };

const defaultoryTask = pipe(
  allTasks,
  TE.map(([elements, materials, { models, buildModules }, houseTypes]) => {
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

      return T.of(element);
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
      return pipe(
        getBuildElement({ systemId, ifcTag }),
        T.map((buildElement) => {
          const defaultMaterialSpec = buildElement.defaultMaterial;
          const buildMaterial = materials.find(
            (m) =>
              m.systemId === systemId && m.specification === defaultMaterialSpec
          );

          if (typeof buildMaterial === "undefined")
            throw new Error("no material");

          return getThreeMaterial(buildMaterial);
        })
      );
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
