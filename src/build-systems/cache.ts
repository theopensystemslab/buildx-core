import { getThreeMaterial } from "@/three/materials/getThreeMaterial";
import { ThreeMaterial } from "@/three/materials/types";
import { fetchImageAsBlob } from "@/utils/airtable";
import Dexie from "dexie";
import { sequenceT } from "fp-ts/lib/Apply";
import { flow, pipe } from "fp-ts/lib/function";
import {
  BufferGeometry,
  BufferGeometryLoader,
  NormalBufferAttributes,
} from "three";
import { A, E, O, R, TE, runUntilFirstSuccess } from "../utils/functions";
import { BuildElement, remoteElementsTE } from "./remote/elements";
import { HouseType, remoteHouseTypesTE } from "./remote/houseTypes";
import { LevelType, remoteLevelTypesTE } from "./remote/levelTypes";
import { BuildMaterial, remoteMaterialsTE } from "./remote/materials";
import { BuildModel, remoteModelTE, remoteModelsTE } from "./remote/models";
import { BuildModule, remoteModulesTE } from "./remote/modules";
import { SectionType, remoteSectionTypesTE } from "./remote/sectionTypes";
import { WindowType, remoteWindowTypesTE } from "./remote/windowTypes";

const bufferGeometryLoader = new BufferGeometryLoader();

export type CachedBuildModel = {
  speckleBranchUrl: string;
  geometries: any;
};

export type BlobbedImage<T> = Omit<T, "imageUrl"> & {
  imageBlob: Blob;
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
  // blocks: Dexie.Table<Block, string>
  // blockModuleEntries: Dexie.Table<BlockModulesEntry, string>
  // spaceTypes: Dexie.Table<SpaceType, string>
  // energyInfos: Dexie.Table<EnergyInfo, string>
  // settings: Dexie.Table<SystemSettings, string>

  constructor() {
    super("BuildSystemsDatabase");
    this.version(2).stores({
      modules: "[systemId+dna]",
      houseTypes: "id",
      elements: "[systemId+ifcTag]",
      materials: "[systemId+specification]",
      models: "speckleBranchUrl",
      sectionTypes: "[systemId+code]",
      levelTypes: "[systemId+code]",
      windowTypes: "[systemId+code]",
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
    this.sectionTypes = this.table("sectionTypes");
    this.levelTypes = this.table("levelTypes");
    this.windowTypes = this.table("windowTypes");
    // this.blocks = this.table("blocks")
    // this.blockModuleEntries = this.table("blockModuleEntries")
    // this.spaceTypes = this.table("spaceTypes")
    // this.energyInfos = this.table("energyInfos")
    // this.settings = this.table("settings")
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
  // I need to do like this but for all of the other similar functions too
  pipe(
    remoteElementsTE,
    TE.map((elements) => {
      buildSystemsCache.elements.bulkPut(elements);
      return elements;
    })
  ),
]);

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

export const cachedMaterialsTE = runUntilFirstSuccess([
  localMaterialsTE,
  pipe(
    remoteMaterialsTE,
    TE.chain((remoteMaterials) =>
      pipe(
        remoteMaterials,
        A.traverse(TE.ApplicativePar)(({ imageUrl, ...material }) =>
          pipe(
            TE.tryCatch(
              () => fetchImageAsBlob(imageUrl),
              (reason) =>
                reason instanceof Error ? reason : new Error(String(reason))
            ),
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
              TE.tryCatch(
                () => fetchImageAsBlob(imageUrl),
                (reason) =>
                  reason instanceof Error ? reason : new Error(String(reason))
              ),
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
            TE.tryCatch(
              () => fetchImageAsBlob(imageUrl),
              (reason) =>
                reason instanceof Error ? reason : new Error(String(reason))
            ),
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
