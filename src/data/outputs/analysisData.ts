import { A, O, R } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { House, housesToRecord, useHouses } from "../user/houses";
import {
  BuildModule,
  BuildElement,
  CachedBuildMaterial,
  EnergyInfo,
  SpaceType,
  CachedWindowType,
  useBuildModules,
  useSpaceTypes,
  useWindowTypes,
  useBuildMaterials,
  useBuildElements,
  useEnergyInfos,
} from "../build-systems";
import { Range } from "@/utils/types";

export interface DashboardData {
  byHouse: Record<string, HouseInfo>;
  unitsCount: number;
  areas: Areas;
  costs: Costs;
  operationalCo2: OperationalCo2;
  embodiedCo2: EmbodiedCo2;
  energyUse: EnergyUse;
  colorsByHouseId: Record<string, string>;
}

// Areas

export interface Areas {
  totalFloor: number;
  foundation: number;
  groundFloor: number;
  firstFloor: number;
  secondFloor: number;
  cladding: number;
  internalLining: number;
  roofing: number;
  bedroom: number;
  bathroom: number;
  living: number;
  kitchen: number;
  windowsAndDoors: number;
}

const emptyAreas = (): Areas => ({
  totalFloor: 0,
  foundation: 0,
  groundFloor: 0,
  firstFloor: 0,
  secondFloor: 0,
  cladding: 0,
  internalLining: 0,
  roofing: 0,
  bedroom: 0,
  bathroom: 0,
  living: 0,
  kitchen: 0,
  windowsAndDoors: 0,
});

const accumulateAreas = (areas: Areas[]): Areas =>
  areas.reduce((accumulator, current) => {
    return {
      totalFloor: accumulator.totalFloor + current.totalFloor,
      foundation: accumulator.foundation + current.foundation,
      groundFloor: accumulator.groundFloor + current.groundFloor,
      firstFloor: accumulator.firstFloor + current.firstFloor,
      secondFloor: accumulator.secondFloor + current.secondFloor,
      cladding: accumulator.cladding + current.cladding,
      internalLining: accumulator.roofing + current.internalLining,
      roofing: accumulator.roofing + current.roofing,
      bedroom: accumulator.bedroom + current.bedroom,
      bathroom: accumulator.bathroom + current.bathroom,
      living: accumulator.living + current.living,
      kitchen: accumulator.kitchen + current.kitchen,
      windowsAndDoors: accumulator.windowsAndDoors + current.windowsAndDoors,
    };
  }, emptyAreas());

// Costs

export interface Costs {
  foundation: number;
  roofStructure: number;
  superstructure: number;
  roofing: Range;
  internalLining: Range;
  cladding: Range;
  total: Range;
  comparative: number;
}

const emptyCosts = (): Costs => ({
  foundation: 0,
  roofStructure: 0,
  superstructure: 0,
  roofing: { min: 0, max: 0 },
  internalLining: { min: 0, max: 0 },
  cladding: { min: 0, max: 0 },
  total: { min: 0, max: 0 },
  comparative: 0,
});

const accumulateCosts = (areas: Costs[]): Costs =>
  areas.reduce((accumulator, current) => {
    return {
      foundation: accumulator.foundation + current.foundation,
      roofStructure: accumulator.roofStructure + current.roofStructure,
      superstructure: accumulator.superstructure + current.superstructure,
      roofing: {
        min: accumulator.roofing.min + current.roofing.min,
        max: accumulator.roofing.max + current.roofing.max,
      },
      internalLining: {
        min: accumulator.internalLining.min + current.internalLining.min,
        max: accumulator.internalLining.max + current.internalLining.max,
      },
      cladding: {
        min: accumulator.cladding.min + current.cladding.min,
        max: accumulator.cladding.max + current.cladding.max,
      },
      total: {
        min: accumulator.total.min + current.total.min,
        max: accumulator.total.max + current.total.max,
      },
      comparative: accumulator.comparative + current.comparative,
    };
  }, emptyCosts());

// Operational Co2

export interface OperationalCo2 {
  annualTotal: number;
  annualComparative: number;
  lifetime: number;
}

const emptyOperationalCo2 = (): OperationalCo2 => ({
  annualTotal: 0,
  annualComparative: 0,
  lifetime: 0,
});

const accumulateOperationalCo2 = (values: OperationalCo2[]): OperationalCo2 =>
  values.reduce((accumulator, current) => {
    return {
      annualTotal: accumulator.annualTotal + current.annualTotal,
      annualComparative:
        accumulator.annualComparative + current.annualComparative,
      lifetime: accumulator.lifetime + current.lifetime,
    };
  }, emptyOperationalCo2());

// Embodied Co2

export interface EmbodiedCo2 {
  foundations: number;
  modules: number;
  roofing: Range;
  internalLining: Range;
  cladding: Range;
  total: Range;
  comparative: number;
}

const emptyEmbodiedCo2 = (): EmbodiedCo2 => ({
  foundations: 0,
  modules: 0,
  roofing: { min: 0, max: 0 },
  internalLining: { min: 0, max: 0 },
  cladding: { min: 0, max: 0 },
  total: { min: 0, max: 0 },
  comparative: 0,
});

const accumulateEmbodiedCo2 = (values: EmbodiedCo2[]): EmbodiedCo2 =>
  values.reduce((accumulator, current) => {
    return {
      foundations: accumulator.foundations + current.foundations,
      modules: accumulator.modules + current.modules,
      cladding: {
        min: accumulator.cladding.min + current.cladding.min,
        max: accumulator.cladding.max + current.cladding.max,
      },
      roofing: {
        min: accumulator.roofing.min + current.roofing.min,
        max: accumulator.roofing.max + current.roofing.max,
      },
      internalLining: {
        min: accumulator.internalLining.min + current.internalLining.min,
        max: accumulator.internalLining.max + current.internalLining.max,
      },
      total: {
        min: accumulator.total.min + current.total.min,
        max: accumulator.total.max + current.total.max,
      },
      comparative: accumulator.comparative + current.comparative,
    };
  }, emptyEmbodiedCo2());

// Energy use

export interface EnergyUse {
  dhwDemand: number;
  spaceHeatingDemand: number;
  totalHeatingDemand: number;
  primaryEnergyDemand: number;
  spaceHeatingDemandComparative: number;
  spaceHeatingDemandNZEBComparative: number;
  dhwCost: number;
  spaceHeatingCost: number;
  totalHeatingCost: number;
  primaryEnergyCost: number;
}

const emptyEnergyUse = (): EnergyUse => ({
  dhwDemand: 0,
  spaceHeatingDemand: 0,
  totalHeatingDemand: 0,
  primaryEnergyDemand: 0,
  spaceHeatingDemandComparative: 0,
  spaceHeatingDemandNZEBComparative: 0,
  dhwCost: 0,
  spaceHeatingCost: 0,
  totalHeatingCost: 0,
  primaryEnergyCost: 0,
});

const accumulateEnergyUse = (values: EnergyUse[]): EnergyUse =>
  values.reduce((accumulator, current) => {
    return {
      dhwDemand: accumulator.dhwDemand + current.dhwDemand,
      spaceHeatingDemand:
        accumulator.spaceHeatingDemand + current.spaceHeatingDemand,
      totalHeatingDemand:
        accumulator.totalHeatingDemand + current.totalHeatingDemand,
      primaryEnergyDemand:
        accumulator.primaryEnergyDemand + current.primaryEnergyDemand,
      spaceHeatingDemandComparative:
        accumulator.spaceHeatingDemandComparative +
        current.spaceHeatingDemandComparative,
      spaceHeatingDemandNZEBComparative:
        accumulator.spaceHeatingDemandNZEBComparative +
        current.spaceHeatingDemandNZEBComparative,
      dhwCost: accumulator.dhwCost + current.dhwCost,
      spaceHeatingCost: accumulator.spaceHeatingCost + current.spaceHeatingCost,
      totalHeatingCost: accumulator.totalHeatingCost + current.totalHeatingCost,
      primaryEnergyCost:
        accumulator.primaryEnergyCost + current.primaryEnergyCost,
    };
  }, emptyEnergyUse());

// u-values

export interface UValues {
  glazingUValue: number;
  wallUValue: number;
  floorUValue: number;
  roofUValue: number;
}

export interface HouseInfo {
  houseModules: BuildModule[];
  areas: Areas;
  costs: Costs;
  operationalCo2: OperationalCo2;
  embodiedCo2: EmbodiedCo2;
  energyUse: EnergyUse;
  embodiedCarbon: number;
  uValues: UValues;
}

// TODO: retrieve from Airtable instead of hard-coding
const comparative = {
  cost: 1600,
  operationalCo2: 20,
  embodiedCo2: 300,
  spaceHeatingDemand: 75,
  spaceHeatingDemandNZEB: 25,
};

export const matchSpecialMaterials = (
  house: House,
  context: {
    elements: BuildElement[];
    materials: CachedBuildMaterial[];
  }
): {
  cladding?: CachedBuildMaterial;
  roofing?: CachedBuildMaterial;
  internalLining?: CachedBuildMaterial;
} => {
  const claddingIfcTag = "IFCCOVERING";

  const claddingElement = context.elements.find(
    (element) =>
      element.systemId === house.systemId && element.ifcTag === claddingIfcTag
  );

  const internalLiningIfcTag = "IFCFURNITURE";

  const internalLiningElement = context.elements.find(
    (element) =>
      element.systemId === house.systemId &&
      element.ifcTag === internalLiningIfcTag
  );

  const roofingElementIfcTag = "IFCROOF";

  const roofingElement = context.elements.find(
    (element) =>
      element.systemId === house.systemId &&
      element.ifcTag === roofingElementIfcTag
  );

  const claddingMaterial: CachedBuildMaterial | undefined =
    claddingElement &&
    context.materials.find(
      (material) =>
        material.systemId === house.systemId &&
        material.specification ===
          (house.activeElementMaterials[claddingIfcTag] ||
            claddingElement.defaultMaterial)
    );

  const internalLiningMaterial: CachedBuildMaterial | undefined =
    internalLiningElement &&
    context.materials.find(
      (material) =>
        material.systemId === house.systemId &&
        material.specification ===
          (house.activeElementMaterials[internalLiningIfcTag] ||
            internalLiningElement.defaultMaterial)
    );

  const roofingMaterial: CachedBuildMaterial | undefined =
    roofingElement &&
    context.materials.find(
      (material) =>
        material.systemId === house.systemId &&
        material.specification ===
          (house.activeElementMaterials[roofingElementIfcTag] ||
            roofingElement.defaultMaterial)
    );

  return {
    cladding: claddingMaterial,
    internalLining: internalLiningMaterial,
    roofing: roofingMaterial,
  };
};

const calculateHouseInfo = (
  house: House,
  houseModules: BuildModule[],
  context: {
    energyInfo: EnergyInfo;
    spaceTypes: SpaceType[];
    windowTypes: CachedWindowType[];
    elements: BuildElement[];
    materials: CachedBuildMaterial[];
  }
): HouseInfo => {
  const { energyInfo, spaceTypes, windowTypes, elements, materials } = context;

  const accumulateModuleDataIf = (
    fn: (module: BuildModule) => boolean,
    getValue: (module: BuildModule) => number
  ) => {
    return houseModules.reduce((accumulator, current) => {
      return accumulator + (fn(current) ? getValue(current) : 0);
    }, 0);
  };

  const accumulateModuleData = (getValue: (module: BuildModule) => number) => {
    return accumulateModuleDataIf(() => true, getValue);
  };

  const specialMaterial = matchSpecialMaterials(house, {
    elements,
    materials,
  });

  const bedroomId = spaceTypes.find(
    (spaceType) =>
      spaceType.systemId === house.systemId && spaceType.code === "BEDR"
  )?.id;

  const bathroomId = spaceTypes.find(
    (spaceType) =>
      spaceType.systemId === house.systemId && spaceType.code === "BATH"
  )?.id;

  const livingId = spaceTypes.find(
    (spaceType) =>
      spaceType.systemId === house.systemId && spaceType.code === "LIVN"
  )?.id;

  const kitchenId = spaceTypes.find(
    (spaceType) =>
      spaceType.systemId === house.systemId && spaceType.code === "KITC"
  )?.id;

  const totalFloorArea = accumulateModuleData((module) => module.floorArea);

  const areas: Areas = {
    totalFloor: totalFloorArea,
    foundation: accumulateModuleDataIf(
      (module) => module.structuredDna.levelType[0] === "F",
      (module) => module.floorArea
    ),
    groundFloor: accumulateModuleDataIf(
      (module) => module.structuredDna.levelType[0] === "G",
      (module) => module.floorArea
    ),
    firstFloor: accumulateModuleDataIf(
      (module) => module.structuredDna.levelType[0] === "M",
      (module) => module.floorArea
    ),
    secondFloor: accumulateModuleDataIf(
      (module) => module.structuredDna.levelType[0] === "T",
      (module) => module.floorArea
    ),
    internalLining: accumulateModuleDataIf(
      () => true,
      (module) => module.liningArea
    ),
    cladding: accumulateModuleData((module) => module.claddingArea),
    roofing: accumulateModuleData((module) => module.roofingArea),
    bedroom: accumulateModuleDataIf(
      (module) => module.spaceType === bedroomId,
      (module) => module.floorArea
    ),
    bathroom: accumulateModuleDataIf(
      (module) => module.spaceType === bathroomId,
      (module) => module.floorArea
    ),
    living: accumulateModuleDataIf(
      (module) => module.spaceType === livingId,
      (module) => module.floorArea
    ),
    kitchen: accumulateModuleDataIf(
      (module) => module.spaceType === kitchenId,
      (module) => module.floorArea
    ),
    windowsAndDoors: accumulateModuleData((module) => {
      const glazingAreas = [
        module.structuredDna.windowTypeEnd,
        module.structuredDna.windowTypeTop,
        module.structuredDna.windowTypeSide1,
        module.structuredDna.windowTypeSide2,
      ].map(
        (code) =>
          windowTypes.find(
            (windowType) =>
              windowType.code === code && windowType.systemId === house.systemId
          )?.glazingArea || 0
      );
      return glazingAreas.reduce((a, b) => a + b, 0);
    }),
  };

  const roofingCost: Range = {
    min: accumulateModuleData(
      (module) =>
        module.roofingArea * (specialMaterial.roofing?.costPerUnit.min || 0)
    ),
    max: accumulateModuleData(
      (module) =>
        module.roofingArea * (specialMaterial.roofing?.costPerUnit.max || 0)
    ),
  };

  const internalLiningCost: Range = {
    min: accumulateModuleData(
      (module) =>
        module.liningArea *
        (specialMaterial.internalLining?.costPerUnit.min || 0)
    ),
    max: accumulateModuleData(
      (module) =>
        module.liningArea *
        (specialMaterial.internalLining?.costPerUnit.max || 0)
    ),
  };

  const claddingCost: Range = {
    min: accumulateModuleData(
      (module) =>
        module.claddingArea * (specialMaterial.cladding?.costPerUnit.min || 0)
    ),
    max: accumulateModuleData(
      (module) =>
        module.claddingArea * (specialMaterial.cladding?.costPerUnit.max || 0)
    ),
  };

  const costs: Costs = {
    foundation: accumulateModuleDataIf(
      (module) => module.structuredDna.levelType[0] === "F",
      (module) => module.cost
    ),
    roofStructure: accumulateModuleDataIf(
      (module) => module.structuredDna.levelType[0] === "R",
      (module) => module.cost
    ),
    superstructure: accumulateModuleDataIf(
      (module) =>
        module.structuredDna.levelType[0] !== "F" &&
        module.structuredDna.levelType[0] !== "R",
      (module) => module.cost
    ),
    roofing: roofingCost,
    internalLining: internalLiningCost,
    cladding: claddingCost,
    total: {
      min:
        accumulateModuleData((module) => module.cost) +
        roofingCost.min +
        internalLiningCost.min +
        claddingCost.min,
      max:
        accumulateModuleData((module) => module.cost) +
        roofingCost.max +
        internalLiningCost.max +
        claddingCost.max,
    },
    comparative: totalFloorArea * comparative.cost,
  };

  const annualTotalOperationalCo2 = totalFloorArea * energyInfo.operationalCo2;

  const operationalCo2: OperationalCo2 = {
    annualTotal: annualTotalOperationalCo2,
    annualComparative: totalFloorArea * comparative.operationalCo2,
    lifetime: annualTotalOperationalCo2 * 100,
  };

  const claddingEmbodiedCo2 = {
    min: accumulateModuleData(
      (module) =>
        module.claddingArea *
        (specialMaterial.cladding?.embodiedCarbonPerUnit.min || 0)
    ),
    max: accumulateModuleData(
      (module) =>
        module.claddingArea *
        (specialMaterial.cladding?.embodiedCarbonPerUnit.max || 0)
    ),
  };

  const roofingEmbodiedCo2 = {
    min: accumulateModuleData(
      (module) =>
        module.roofingArea *
        (specialMaterial.roofing?.embodiedCarbonPerUnit.min || 0)
    ),
    max: accumulateModuleData(
      (module) =>
        module.roofingArea *
        (specialMaterial.roofing?.embodiedCarbonPerUnit.max || 0)
    ),
  };

  const internalLiningEmbodiedCo2 = {
    min: accumulateModuleData(
      (module) =>
        module.liningArea *
        (specialMaterial.internalLining?.embodiedCarbonPerUnit.min || 0)
    ),
    max: accumulateModuleData(
      (module) =>
        module.liningArea *
        (specialMaterial.internalLining?.embodiedCarbonPerUnit.max || 0)
    ),
  };

  const foundationsEmbodiedCo2 = accumulateModuleDataIf(
    (module) => module.structuredDna.levelType[0] === "F",
    (module) => module.embodiedCarbon
  );

  const modulesEmbodiedCo2 = accumulateModuleDataIf(
    (module) => module.structuredDna.levelType[0] !== "F",
    (module) => module.embodiedCarbon
  );

  const embodiedCo2: EmbodiedCo2 = {
    foundations: foundationsEmbodiedCo2,
    modules: modulesEmbodiedCo2,
    cladding: claddingEmbodiedCo2,
    roofing: roofingEmbodiedCo2,
    internalLining: internalLiningEmbodiedCo2,
    comparative: totalFloorArea * comparative.embodiedCo2,
    total: {
      min:
        foundationsEmbodiedCo2 +
        modulesEmbodiedCo2 +
        claddingEmbodiedCo2.min +
        roofingEmbodiedCo2.min +
        internalLiningEmbodiedCo2.min,
      max:
        foundationsEmbodiedCo2 +
        modulesEmbodiedCo2 +
        claddingEmbodiedCo2.max +
        roofingEmbodiedCo2.max +
        internalLiningEmbodiedCo2.max,
    },
  };

  const energyUse: EnergyUse = {
    dhwDemand: totalFloorArea * energyInfo.dhwDemand,
    spaceHeatingDemand: totalFloorArea * energyInfo.spaceHeatingDemand,
    totalHeatingDemand: totalFloorArea * energyInfo.totalHeatingDemand,
    primaryEnergyDemand: totalFloorArea * energyInfo.primaryEnergyDemand,
    spaceHeatingDemandComparative:
      comparative.spaceHeatingDemand * totalFloorArea,
    spaceHeatingDemandNZEBComparative:
      comparative.spaceHeatingDemandNZEB * totalFloorArea,
    dhwCost:
      totalFloorArea * energyInfo.dhwDemand * energyInfo.electricityTariff,
    spaceHeatingCost:
      totalFloorArea *
      energyInfo.spaceHeatingDemand *
      energyInfo.electricityTariff,
    totalHeatingCost:
      totalFloorArea *
      energyInfo.totalHeatingDemand *
      energyInfo.electricityTariff,
    primaryEnergyCost:
      totalFloorArea *
      energyInfo.primaryEnergyDemand *
      energyInfo.electricityTariff,
  };

  return {
    houseModules,
    areas,
    costs,
    operationalCo2,
    embodiedCo2,
    energyUse,
    embodiedCarbon: accumulateModuleDataIf(
      () => true,
      (module) => module.embodiedCarbon
    ),
    uValues: {
      glazingUValue: energyInfo.glazingUValue,
      wallUValue: energyInfo.wallUValue,
      floorUValue: energyInfo.floorUValue,
      roofUValue: energyInfo.roofUValue,
    },
  };
};

const getHouseModules = (house: House, modules: BuildModule[]) => {
  const { systemId, dnas } = house;
  return pipe(
    dnas,
    A.filterMap((dna) =>
      pipe(
        modules,
        A.findFirst((x) => x.systemId === systemId && x.dna === dna)
      )
    )
  );
};

export const useAnalysisData = (explicitSelectedHouseIds?: string[]) => {
  const houses = useHouses();
  const modules = useBuildModules();
  const spaceTypes = useSpaceTypes();
  const windowTypes = useWindowTypes();
  const materials = useBuildMaterials();
  const elements = useBuildElements();
  const energyInfos = useEnergyInfos();

  const selectedHouseIds =
    explicitSelectedHouseIds ?? houses.map((x) => x.houseId);

  const byHouse = pipe(
    houses,
    housesToRecord,
    R.filterMap((house) => {
      if (!selectedHouseIds.includes(house.houseId)) return O.none;

      const { systemId } = house;
      const energyInfo = energyInfos.find((x) => x.systemId === systemId);

      if (!energyInfo) {
        return O.none;
      }

      return pipe(
        getHouseModules(house, modules),
        (houseModules) =>
          calculateHouseInfo(house, houseModules, {
            energyInfo,
            spaceTypes,
            windowTypes,
            materials,
            elements,
          }),
        O.some
      );
    })
  );

  return {
    byHouse,
    areas: accumulateAreas(
      Object.values(byHouse).map((houseInfo) => houseInfo.areas)
    ),
    costs: accumulateCosts(
      Object.values(byHouse).map((houseInfo) => houseInfo.costs)
    ),
    operationalCo2: accumulateOperationalCo2(
      Object.values(byHouse).map((houseInfo) => houseInfo.operationalCo2)
    ),
    embodiedCo2: accumulateEmbodiedCo2(
      Object.values(byHouse).map((houseInfo) => houseInfo.embodiedCo2)
    ),
    energyUse: accumulateEnergyUse(
      Object.values(byHouse).map((houseInfo) => houseInfo.energyUse)
    ),
    unitsCount: selectedHouseIds.length,
  };
};

export type AnalysisData = ReturnType<typeof useAnalysisData>;
