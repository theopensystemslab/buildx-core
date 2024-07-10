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
