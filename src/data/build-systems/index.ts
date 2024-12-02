import { TE, unwrapTaskEither } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { cachedBlockModuleEntriesTE } from "./blockModulesEntries";
import { cachedBlocksTE } from "./blocks";
import { cachedElementsTE } from "./elements";
import { cachedEnergyInfosTE } from "./energyInfos";
import { cachedHouseTypesTE } from "./houseTypes";
import { cachedLevelTypesTE } from "./levelTypes";
import { cachedMaterialsTE } from "./materials";
import { cachedModelsTE } from "./models";
import { cachedModulesTE } from "./modules";
import { cachedSectionTypesTE } from "./sectionTypes";
import { cachedSystemSettingsTE } from "./settings";
import { cachedSpaceTypesTE } from "./spaceTypes";
import { cachedWindowTypesTE } from "./windowTypes";
import { suspend } from "suspend-react";
import { pipe } from "fp-ts/lib/function";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

export const housePriorityDataTE = sequenceT(TE.ApplicativePar)(
  cachedModulesTE,
  cachedModelsTE,
  cachedElementsTE,
  cachedMaterialsTE
);

export const allBuildSystemsData = sequenceT(TE.ApplicativePar)(
  cachedHouseTypesTE,
  cachedMaterialsTE,
  cachedElementsTE,
  cachedModulesTE,
  cachedModelsTE,
  cachedSectionTypesTE,
  cachedLevelTypesTE,
  cachedWindowTypesTE,
  cachedBlocksTE,
  cachedBlockModuleEntriesTE,
  cachedSpaceTypesTE,
  cachedEnergyInfosTE,
  cachedSystemSettingsTE
);

export const useSuspendAllBuildData = () =>
  suspend(() => pipe(allBuildSystemsData, unwrapTaskEither), ["allBuildData"]);

export const useAllBuildSystemsDataLiveQuery = () =>
  useLiveQuery(async () => {
    const houseTypes = await buildSystemsCache.houseTypes.toArray();
    const materials = await buildSystemsCache.materials.toArray();
    const elements = await buildSystemsCache.elements.toArray();
    const modules = await buildSystemsCache.modules.toArray();
    const models = await buildSystemsCache.models.toArray();
    const sectionTypes = await buildSystemsCache.sectionTypes.toArray();
    const levelTypes = await buildSystemsCache.levelTypes.toArray();
    const windowTypes = await buildSystemsCache.windowTypes.toArray();
    const blocks = await buildSystemsCache.blocks.toArray();
    const blockModuleEntries =
      await buildSystemsCache.blockModuleEntries.toArray();
    const spaceTypes = await buildSystemsCache.spaceTypes.toArray();
    const energyInfos = await buildSystemsCache.energyInfos.toArray();
    const systemSettings = await buildSystemsCache.settings.toArray();

    return {
      houseTypes,
      materials,
      elements,
      modules,
      models,
      sectionTypes,
      levelTypes,
      windowTypes,
      blocks,
      blockModuleEntries,
      spaceTypes,
      energyInfos,
      systemSettings,
    };
  });

export type AllBuildSystemsData = NonNullable<
  Awaited<ReturnType<typeof useAllBuildSystemsDataLiveQuery>>
>;

export const useSuspendHousePriorityData = () =>
  suspend(
    () => pipe(housePriorityDataTE, unwrapTaskEither),
    ["housePriorityData"]
  );

export const useSuspendHouseTypes = () =>
  suspend(() => pipe(cachedHouseTypesTE, unwrapTaskEither), ["houseTypes"]);

export * from "./blockModulesEntries";
export * from "./blocks";
export * from "./elements";
export * from "./energyInfos";
export * from "./houseTypes";
export * from "./levelTypes";
export * from "./materials";
export * from "./models";
export * from "./modules";
export * from "./sectionTypes";
export * from "./settings";
export * from "./spaceTypes";
export * from "./stairTypes";
export * from "./windowTypes";

export { systems as buildSystems } from "./systems";
