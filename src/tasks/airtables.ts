import { BuildElement, elementsQuery } from "@/systemsData/elements";
import { HouseType, houseTypesQuery } from "@/systemsData/houseTypes";
import { BuildMaterial, materialsQuery } from "@/systemsData/materials";
import { BuildModule, modulesQuery } from "@/systemsData/modules";
import { T } from "@/utils/functions";

const systemIds = ["speckle-skylark"];

export const elementsTask: T.Task<BuildElement[]> = () =>
  elementsQuery({ systemIds });

export const materialsTask: T.Task<BuildMaterial[]> = () =>
  materialsQuery({ systemIds });

export const modulesTask: T.Task<BuildModule[]> = () =>
  modulesQuery({ systemIds });

export const houseTypesTask: T.Task<HouseType[]> = () =>
  houseTypesQuery({ systemIds });
