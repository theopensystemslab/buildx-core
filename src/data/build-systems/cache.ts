import { getThreeMaterial } from "@/three/materials/getThreeMaterial";
import { ThreeMaterial } from "@/three/materials/types";
import { fetchImageAsBlob } from "@/utils/airtable";
import { A, E, O, R, TE, runUntilFirstSuccess } from "@/utils/functions";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { sequenceT } from "fp-ts/lib/Apply";
import { flow, pipe } from "fp-ts/lib/function";
import {
  BufferGeometry,
  BufferGeometryLoader,
  NormalBufferAttributes,
} from "three";
import {
  BlockModulesEntry,
  remoteBlockModulesEntriesTE,
} from "./remote/blockModulesEntries";
import { Block, remoteBlocksTE } from "./remote/blocks";
import { BuildElement, remoteElementsTE } from "./remote/elements";
import { EnergyInfo, remoteEnergyInfosTE } from "./remote/energyInfos";
import { HouseType, remoteHouseTypesTE } from "./remote/houseTypes";
import { LevelType, remoteLevelTypesTE } from "./remote/levelTypes";
import { BuildMaterial, remoteMaterialsTE } from "./remote/materials";
import { BuildModel, remoteModelTE, remoteModelsTE } from "./remote/models";
import { BuildModule, remoteModulesTE } from "./remote/modules";
import { SectionType, remoteSectionTypesTE } from "./remote/sectionTypes";
import { SystemSettings, remoteSystemSettingsTE } from "./remote/settings";
import { SpaceType, remoteSpaceTypesTE } from "./remote/spaceTypes";
import { WindowType, remoteWindowTypesTE } from "./remote/windowTypes";

const bufferGeometryLoader = new BufferGeometryLoader();

export type CachedBuildModel = {
  speckleBranchUrl: string;
  geometries: any;
};

export type BlobbedImage<T> = Omit<T, "imageUrl"> & {
  imageBlob?: Blob;
};

export type CachedHouseType = BlobbedImage<HouseType>;

export type CachedBuildMaterial = BlobbedImage<BuildMaterial>;

export type CachedWindowType = BlobbedImage<WindowType>;

class BuildSystemsCache extends Dexie {
  modules: Dexie.Table<BuildModule, string>;
  houseTypes: Dexie.Table<CachedHouseType, string>;
  elements: Dexie.Table<BuildElement, string>;
  materials: Dexie.Table<CachedBuildMaterial, string>;
  models: Dexie.Table<CachedBuildModel, string>;
  sectionTypes: Dexie.Table<SectionType, string>;
  levelTypes: Dexie.Table<LevelType, string>;
  windowTypes: Dexie.Table<CachedWindowType, string>;
  blocks: Dexie.Table<Block, string>;
  blockModuleEntries: Dexie.Table<BlockModulesEntry, string>;
  spaceTypes: Dexie.Table<SpaceType, string>;
  energyInfos: Dexie.Table<EnergyInfo, string>;
  settings: Dexie.Table<SystemSettings, string>;

  constructor() {
    super("BuildSystemsCache");

    this.version(3).stores({
      modules: "[systemId+dna]",
      houseTypes: "id",
      elements: "[systemId+ifcTag]",
      materials: "[systemId+specification]",
      models: "speckleBranchUrl",
      sectionTypes: "[systemId+code]",
      levelTypes: "[systemId+code]",
      windowTypes: "[systemId+code]",
      blocks: "[systemId+name]",
      blockModuleEntries: "id",
      spaceTypes: "id",
      energyInfos: "id",
      settings: "systemId",
    });
    this.modules = this.table("modules");
    this.houseTypes = this.table("houseTypes");
    this.elements = this.table("elements");
    this.materials = this.table("materials");
    this.models = this.table("models");
    this.sectionTypes = this.table("sectionTypes");
    this.levelTypes = this.table("levelTypes");
    this.windowTypes = this.table("windowTypes");
    this.blocks = this.table("blocks");
    this.blockModuleEntries = this.table("blockModuleEntries");
    this.spaceTypes = this.table("spaceTypes");
    this.energyInfos = this.table("energyInfos");
    this.settings = this.table("settings");
  }
}

const buildSystemsCache = new BuildSystemsCache();

// ELEMENTS

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
  pipe(
    remoteElementsTE,
    TE.map((elements) => {
      buildSystemsCache.elements.bulkPut(elements);
      return elements;
    })
  ),
]);

export const useBuildElements = (): BuildElement[] =>
  useLiveQuery(() => buildSystemsCache.elements.toArray(), [], []);

export const elementGetterTE = pipe(
  cachedElementsTE,
  TE.map(
    (elements) =>
      ({ systemId, ifcTag }: { systemId: string; ifcTag: string }) =>
        pipe(
          elements,
          A.findFirst<BuildElement>(
            (x) => x.systemId === systemId && x.ifcTag === ifcTag
          ),
          E.fromOption(() => Error(`no ${ifcTag} element found in ${systemId}`))
        )
  )
);

// MODULES

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

export const useBuildModules = (): BuildModule[] =>
  useLiveQuery(() => buildSystemsCache.modules.toArray(), [], []);

// MATERIALS

export const localMaterialsTE: TE.TaskEither<Error, CachedBuildMaterial[]> =
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

const tryCatchImageBlob = (imageUrl: string | undefined) =>
  TE.tryCatch(
    () => {
      return typeof imageUrl === "undefined"
        ? Promise.resolve(undefined)
        : fetchImageAsBlob(imageUrl);
    },
    (reason) => {
      return reason instanceof Error ? reason : new Error(String(reason));
    }
  );

export const cachedMaterialsTE = runUntilFirstSuccess([
  localMaterialsTE,
  pipe(
    remoteMaterialsTE,
    TE.chain((remoteMaterials) =>
      pipe(
        remoteMaterials,
        A.traverse(TE.ApplicativePar)(({ imageUrl, ...material }) =>
          pipe(
            tryCatchImageBlob(imageUrl),
            TE.map((imageBlob) => ({ ...material, imageBlob }))
          )
        ),
        TE.map((materials) => {
          buildSystemsCache.materials.bulkPut(materials);
          return materials;
        })
      )
    )
  ),
]);

export const useBuildMaterials = (): CachedBuildMaterial[] =>
  useLiveQuery(() => buildSystemsCache.materials.toArray(), [], []);

type MaterialGetters = {
  getElement: (
    systemId: string,
    ifcTag: string
  ) => E.Either<Error, BuildElement>;
  getMaterial: (
    systemId: string,
    specification: string
  ) => E.Either<Error, CachedBuildMaterial>;
  getInitialThreeMaterial: (
    systemId: string,
    ifcTag: string
  ) => E.Either<Error, ThreeMaterial>;
};

export const defaultMaterialGettersTE: TE.TaskEither<Error, MaterialGetters> =
  pipe(
    sequenceT(TE.ApplicativePar)(cachedElementsTE, cachedMaterialsTE),
    TE.map(([elements, materials]): MaterialGetters => {
      const getElement = (systemId: string, ifcTag: string) =>
        pipe(
          elements,
          A.findFirst((x) => x.systemId === systemId && x.ifcTag === ifcTag),
          E.fromOption(() =>
            Error(`no element for ${ifcTag} found in ${systemId}`)
          )
        );

      const getMaterial = (systemId: string, specification: string) =>
        pipe(
          materials,
          A.findFirst(
            (m) => m.systemId === systemId && m.specification === specification
          ),
          E.fromOption(() =>
            Error(`no material for ${specification} in ${systemId}`)
          )
        );

      const getInitialThreeMaterial = flow(
        getElement,
        E.chain(({ systemId, defaultMaterial: specification }) =>
          pipe(
            getMaterial(systemId, specification),
            (x) => x,
            E.map((x) => getThreeMaterial(x))
          )
        )
      );

      return {
        getElement,
        getMaterial,
        getInitialThreeMaterial,
      };
    })
  );

// HOUSE TYPES

export const localHouseTypesTE: TE.TaskEither<Error, CachedHouseType[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.houseTypes.toArray().then((houseTypes) => {
        if (A.isEmpty(houseTypes)) {
          throw new Error("No house types found in cache");
        }
        return houseTypes;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedHouseTypesTE: TE.TaskEither<Error, CachedHouseType[]> =
  runUntilFirstSuccess([
    localHouseTypesTE,
    pipe(
      remoteHouseTypesTE,
      TE.chain((remoteHouseTypes) =>
        pipe(
          remoteHouseTypes,
          A.traverse(TE.ApplicativePar)(({ imageUrl, ...houseType }) =>
            pipe(
              tryCatchImageBlob(imageUrl),
              TE.map((imageBlob) => ({ ...houseType, imageBlob }))
            )
          ),
          TE.map((houseTypes) => {
            buildSystemsCache.houseTypes.bulkPut(houseTypes);
            return houseTypes;
          })
        )
      )
    ),
  ]);

export const useHouseTypes = (): CachedHouseType[] =>
  useLiveQuery(() => buildSystemsCache.houseTypes.toArray(), [], []);

// MODELS

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

export const getCachedModelTE = (speckleBranchUrl: string) => {
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

export const useBuildModels = (): BuildModel[] =>
  useLiveQuery(() => buildSystemsCache.models.toArray(), [], []);

// SECTION TYPES

export const localSectionTypesTE: TE.TaskEither<Error, SectionType[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.sectionTypes.toArray().then((sectionTypes) => {
        if (A.isEmpty(sectionTypes)) {
          throw new Error("No modules found in cache");
        }
        return sectionTypes;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedSectionTypesTE = runUntilFirstSuccess([
  localSectionTypesTE,
  pipe(
    remoteSectionTypesTE,
    TE.map((sectionTypes) => {
      buildSystemsCache.sectionTypes.bulkPut(sectionTypes);
      return sectionTypes;
    })
  ),
]);

export const useSectionTypes = (): SectionType[] =>
  useLiveQuery(() => buildSystemsCache.sectionTypes.toArray(), [], []);

export const getSectionType = ({
  systemId,
  code,
}: {
  systemId: string;
  code: string;
}) =>
  pipe(
    cachedSectionTypesTE,
    TE.chain(
      flow(
        A.findFirst((x) => x.code === code && x.systemId === systemId),
        TE.fromOption(
          () => new Error(`no section type found for ${code} in ${systemId}`)
        )
      )
    )
  );

// LEVEL TYPES
export const localLevelTypesTE: TE.TaskEither<Error, LevelType[]> = TE.tryCatch(
  () =>
    buildSystemsCache.levelTypes.toArray().then((levelTypes) => {
      if (A.isEmpty(levelTypes)) {
        throw new Error("No modules found in cache");
      }
      return levelTypes;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedLevelTypesTE = runUntilFirstSuccess([
  localLevelTypesTE,
  pipe(
    remoteLevelTypesTE,
    TE.map((levelTypes) => {
      buildSystemsCache.levelTypes.bulkPut(levelTypes);
      return levelTypes;
    })
  ),
]);

export const useLevelTypes = (): LevelType[] =>
  useLiveQuery(() => buildSystemsCache.levelTypes.toArray(), [], []);

export const getLevelType = ({
  systemId,
  code,
}: {
  systemId: string;
  code: string;
}) =>
  pipe(
    cachedLevelTypesTE,
    TE.chain(
      flow(
        A.findFirst((x) => x.code === code && x.systemId === systemId),
        TE.fromOption(
          () => new Error(`no section type found for ${code} in ${systemId}`)
        )
      )
    )
  );

// WINDOW TYPES

export const localWindowTypesTE: TE.TaskEither<Error, CachedWindowType[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.windowTypes.toArray().then((windowTypes) => {
        if (A.isEmpty(windowTypes)) {
          throw new Error("No window types found in cache");
        }
        return windowTypes;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedWindowTypesTE = runUntilFirstSuccess([
  localWindowTypesTE,
  pipe(
    remoteWindowTypesTE,
    TE.chain((remoteWindowTypes) =>
      pipe(
        remoteWindowTypes,
        A.traverse(TE.ApplicativePar)(({ imageUrl, ...windowType }) =>
          pipe(
            tryCatchImageBlob(imageUrl),
            TE.map((imageBlob) => ({ ...windowType, imageBlob }))
          )
        ),
        TE.map((materials) => {
          buildSystemsCache.windowTypes.bulkPut(materials);
          return materials;
        })
      )
    )
  ),
]);

export const useWindowTypes = (): CachedWindowType[] =>
  useLiveQuery(() => buildSystemsCache.windowTypes.toArray(), [], []);

export const getWindowType = ({
  systemId,
  code,
}: {
  systemId: string;
  code: string;
}) =>
  pipe(
    cachedWindowTypesTE,
    TE.chain(
      flow(
        A.findFirst((x) => x.code === code && x.systemId === systemId),
        TE.fromOption(
          () => new Error(`no window type found for ${code} in ${systemId}`)
        )
      )
    )
  );

// BLOCKS

export const localBlocksTE: TE.TaskEither<Error, Block[]> = TE.tryCatch(
  () =>
    buildSystemsCache.blocks.toArray().then((blocks) => {
      if (A.isEmpty(blocks)) {
        throw new Error("No blocks found in cache");
      }
      return blocks;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedBlocksTE = runUntilFirstSuccess([
  localBlocksTE,
  pipe(
    remoteBlocksTE,
    TE.map((blocks) => {
      buildSystemsCache.blocks.bulkPut(blocks);
      return blocks;
    })
  ),
]);

export const useBlocks = (): Block[] =>
  useLiveQuery(() => buildSystemsCache.blocks.toArray(), [], []);

// BLOCK MODULE ENTRIES

export const localBlockModuleEntriesTE: TE.TaskEither<
  Error,
  BlockModulesEntry[]
> = TE.tryCatch(
  () =>
    buildSystemsCache.blockModuleEntries
      .toArray()
      .then((blockModuleEntries) => {
        if (A.isEmpty(blockModuleEntries)) {
          throw new Error("No blockModuleEntries found in cache");
        }
        return blockModuleEntries;
      }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedBlockModuleEntriesTE = runUntilFirstSuccess([
  localBlockModuleEntriesTE,
  pipe(
    remoteBlockModulesEntriesTE,
    TE.map((blockModuleEntries) => {
      buildSystemsCache.blockModuleEntries.bulkPut(blockModuleEntries);
      return blockModuleEntries;
    })
  ),
]);

export const useBlockModuleEntries = (): BlockModulesEntry[] =>
  useLiveQuery(() => buildSystemsCache.blockModuleEntries.toArray(), [], []);

// SPACE TYPES

export const localSpaceTypesTE: TE.TaskEither<Error, SpaceType[]> = TE.tryCatch(
  () =>
    buildSystemsCache.spaceTypes.toArray().then((spaceTypes) => {
      if (A.isEmpty(spaceTypes)) {
        throw new Error("No spaceTypes found in cache");
      }
      return spaceTypes;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedSpaceTypesTE = runUntilFirstSuccess([
  localSpaceTypesTE,
  pipe(
    remoteSpaceTypesTE,
    TE.map((spaceTypes) => {
      buildSystemsCache.spaceTypes.bulkPut(spaceTypes);
      return spaceTypes;
    })
  ),
]);

export const useSpaceTypes = (): SpaceType[] =>
  useLiveQuery(() => buildSystemsCache.spaceTypes.toArray(), [], []);

// ENERGY INFOS

export const localEnergyInfosTE: TE.TaskEither<Error, EnergyInfo[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.energyInfos.toArray().then((energyInfos) => {
        if (A.isEmpty(energyInfos)) {
          throw new Error("No energyInfos found in cache");
        }
        return energyInfos;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedEnergyInfosTE = runUntilFirstSuccess([
  localEnergyInfosTE,
  pipe(
    remoteEnergyInfosTE,
    TE.map((energyInfos) => {
      buildSystemsCache.energyInfos.bulkPut(energyInfos);
      return energyInfos;
    })
  ),
]);

export const useEnergyInfos = (): EnergyInfo[] =>
  useLiveQuery(() => buildSystemsCache.energyInfos.toArray(), [], []);

// SYSTEM SETTINGS

export const localSystemSettingsTE: TE.TaskEither<Error, SystemSettings[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.settings.toArray().then((systemSettings) => {
        if (A.isEmpty(systemSettings)) {
          throw new Error("No systemSettings found in cache");
        }
        return systemSettings;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedSystemSettingsTE = runUntilFirstSuccess([
  localSystemSettingsTE,
  pipe(
    remoteSystemSettingsTE,
    TE.map((systemSettings) => {
      buildSystemsCache.settings.bulkPut(systemSettings);
      return systemSettings;
    })
  ),
]);

export const useSystemSettings = (): SystemSettings[] =>
  useLiveQuery(() => buildSystemsCache.settings.toArray(), [], []);

export const fetchAllBuildSystems = () =>
  sequenceT(TE.ApplicativePar)(
    cachedModulesTE,
    cachedHouseTypesTE,
    cachedElementsTE,
    cachedMaterialsTE,
    cachedModelsTE,
    cachedSectionTypesTE,
    cachedLevelTypesTE,
    cachedWindowTypesTE,
    cachedBlocksTE,
    cachedBlockModuleEntriesTE,
    cachedSpaceTypesTE,
    cachedEnergyInfosTE,
    cachedSystemSettingsTE
  )();

export default buildSystemsCache;
