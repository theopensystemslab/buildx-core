"use client";
import Dexie from "dexie";
import { flow, pipe } from "fp-ts/lib/function";
import {
  BufferGeometry,
  BufferGeometryLoader,
  NormalBufferAttributes,
} from "three";
import { A, O, R, TE, runUntilFirstSuccess } from "../utils/functions";
import { BuildElement, remoteElementsTE } from "./remote/elements";
import { HouseType, remoteHouseTypesTE } from "./remote/houseTypes";
import { BuildMaterial, remoteMaterialsTE } from "./remote/materials";
import { BuildModel, remoteModelTE, remoteModelsTE } from "./remote/models";
import { BuildModule, remoteModulesTE } from "./remote/modules";

const bufferGeometryLoader = new BufferGeometryLoader();

export type CachedBuildModel = {
  speckleBranchUrl: string;
  geometries: any;
};

class BuildSystemsCache extends Dexie {
  modules: Dexie.Table<BuildModule, string>;
  houseTypes: Dexie.Table<HouseType, string>;
  elements: Dexie.Table<BuildElement, string>;
  materials: Dexie.Table<BuildMaterial, string>;
  models: Dexie.Table<CachedBuildModel, string>;
  // sectionTypes: Dexie.Table<LastFetchStamped<SectionType>, string>
  // levelTypes: Dexie.Table<LastFetchStamped<LevelType>, string>
  // windowTypes: Dexie.Table<LastFetchStamped<WindowType>, string>
  // blocks: Dexie.Table<Block, string>
  // blockModuleEntries: Dexie.Table<BlockModulesEntry, string>
  // spaceTypes: Dexie.Table<SpaceType, string>
  // energyInfos: Dexie.Table<EnergyInfo, string>
  // settings: Dexie.Table<SystemSettings, string>

  constructor() {
    super("SystemsDatabase");
    this.version(1).stores({
      modules: "[systemId+dna]",
      houseTypes: "id",
      elements: "[systemId+ifcTag]",
      materials: "id",
      models: "speckleBranchUrl",
      // sectionTypes: "id",
      // levelTypes: "[systemId+code]",
      // windowTypes: "[systemId+code]",
      // blocks: "[systemId+name]",
      // blockModuleEntries: "id",
      // spaceTypes: "id",
      // energyInfos: "id",
      // settings: "systemId",
    });
    this.modules = this.table("modules");
    this.houseTypes = this.table("houseTypes");
    this.elements = this.table("elements");
    this.materials = this.table("materials");
    this.models = this.table("models");
    // this.sectionTypes = this.table("sectionTypes")
    // this.levelTypes = this.table("levelTypes")
    // this.windowTypes = this.table("windowTypes")
    // this.blocks = this.table("blocks")
    // this.blockModuleEntries = this.table("blockModuleEntries")
    // this.spaceTypes = this.table("spaceTypes")
    // this.energyInfos = this.table("energyInfos")
    // this.settings = this.table("settings")
  }
}

const buildSystemsCache = new BuildSystemsCache();

export const localElementsTE: TE.TaskEither<Error, BuildElement[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.elements.toArray().then((elements) => {
        if (A.isEmpty(elements)) {
          throw new Error("No elements found");
        }
        return elements;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedElementsTE = runUntilFirstSuccess([
  localElementsTE,
  // I need to do like this but for all of the other similar functions too
  pipe(
    remoteElementsTE,
    TE.map((elements) => {
      buildSystemsCache.elements.bulkPut(elements);
      return elements;
    })
  ),
]);

export const localModulesTE: TE.TaskEither<Error, BuildModule[]> = TE.tryCatch(
  () =>
    buildSystemsCache.modules.toArray().then((modules) => {
      if (A.isEmpty(modules)) {
        throw new Error("No modules found in cache");
      }
      return modules;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedModulesTE = runUntilFirstSuccess([
  localModulesTE,
  pipe(
    remoteModulesTE,
    TE.map((modules) => {
      buildSystemsCache.modules.bulkPut(modules);
      return modules;
    })
  ),
]);

export const localMaterialsTE: TE.TaskEither<Error, BuildMaterial[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.materials.toArray().then((materials) => {
        if (A.isEmpty(materials)) {
          throw new Error("No materials found in cache");
        }
        return materials;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedMaterialsTE = runUntilFirstSuccess([
  localMaterialsTE,
  pipe(
    remoteMaterialsTE,
    TE.map((materials) => {
      buildSystemsCache.materials.bulkPut(materials);
      return materials;
    })
  ),
]);

export const localHouseTypesTE: TE.TaskEither<Error, HouseType[]> = TE.tryCatch(
  () =>
    buildSystemsCache.houseTypes.toArray().then((houseTypes) => {
      if (A.isEmpty(houseTypes)) {
        throw new Error("No house types found in cache");
      }
      return houseTypes;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedHouseTypesTE = runUntilFirstSuccess([
  localHouseTypesTE,
  pipe(
    remoteHouseTypesTE,
    TE.map((houseTypes) => {
      buildSystemsCache.houseTypes.bulkPut(houseTypes);
      return houseTypes;
    })
  ),
]);

export const localModelTE = (
  speckleBranchUrl: string
): TE.TaskEither<Error, BuildModel> => {
  return pipe(
    TE.tryCatch(
      () => buildSystemsCache.models.get(speckleBranchUrl),
      (reason) => new Error(String(reason))
    ),
    TE.flatMap(
      flow(
        O.fromNullable,
        TE.fromOption(
          () => new Error(`no model in cache for ${speckleBranchUrl}`)
        )
      )
    ),
    TE.map(({ speckleBranchUrl, geometries }) => {
      return {
        speckleBranchUrl,
        geometries: pipe(
          geometries,
          R.map(
            (x) =>
              bufferGeometryLoader.parse(
                x
              ) as BufferGeometry<NormalBufferAttributes>
          )
        ),
      };
    })
  );
};

export const cachedModelTE = (speckleBranchUrl: string) => {
  return runUntilFirstSuccess([
    localModelTE(speckleBranchUrl),
    pipe(
      remoteModelTE(speckleBranchUrl),
      TE.map((remoteModel) => {
        const { speckleBranchUrl, geometries } = remoteModel;

        buildSystemsCache.models.put({
          speckleBranchUrl,
          geometries: pipe(
            geometries,
            R.map((geometry) => geometry.toJSON())
          ),
        });
        return remoteModel;
      })
    ),
  ]);
};

export const localModelsTE: TE.TaskEither<Error, BuildModel[]> = TE.tryCatch(
  () =>
    buildSystemsCache.models.toArray().then((models) => {
      if (A.isEmpty(models)) {
        throw new Error("No models found in cache");
      }

      return models.map((x) => ({
        ...x,
        geometries: pipe(
          x.geometries,
          R.map(
            (x) =>
              bufferGeometryLoader.parse(
                x
              ) as BufferGeometry<NormalBufferAttributes>
          )
        ),
      }));
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedModelsTE = runUntilFirstSuccess([
  localModelsTE,
  pipe(
    remoteModelsTE,
    TE.map((models) => {
      buildSystemsCache.models.bulkPut(models);
      return models;
    })
  ),
]);
