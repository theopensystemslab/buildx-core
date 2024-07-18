import { TE } from "@/utils/functions";
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

export const housePriorityDataTE = sequenceT(TE.ApplicativePar)(
  cachedModulesTE,
  cachedModelsTE,
  cachedElementsTE,
  cachedMaterialsTE
);

export const allBuildDataTE = sequenceT(TE.ApplicativePar)(
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
);

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
