import { BuildModule } from "@/systemsData/modules";
import { roundp } from "@/utils/math";
import { PositionedBuildModule, Row } from "./types";

export const createPositionedModules = (
  module: BuildModule,
  acc?: PositionedBuildModule[]
): PositionedBuildModule[] => {
  if (acc && acc.length > 0) {
    const prev = acc[acc.length - 1];
    return [
      ...acc,
      {
        module,
        moduleIndex: prev.moduleIndex + 1,
        z: roundp(prev.z + prev.module.length / 2 + module.length / 2),
      },
    ];
  } else {
    return [
      {
        module,
        moduleIndex: 0,
        z: roundp(module.length / 2),
      },
    ];
  }
};

export const createRow = (modules: BuildModule[]): Row => {
  const {
    structuredDna: { levelType },
  } = modules[0];

  let positionedModules: PositionedBuildModule[] = [],
    gridUnits = 0,
    rowLength = 0;

  for (let i = 0; i < modules.length; i++) {
    gridUnits += modules[i].structuredDna.gridUnits;
    rowLength += modules[i].length;
    positionedModules = createPositionedModules(modules[i], positionedModules);
  }

  return {
    positionedModules,
    gridUnits,
    rowLength,
    levelType,
  };
};
