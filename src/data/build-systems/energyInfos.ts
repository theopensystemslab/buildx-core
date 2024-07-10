import airtable from "@/utils/airtable";
import { A, O, runUntilFirstSuccess, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { allSystemIds, systemFromId } from "./systems";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

export type EnergyInfo = {
  id: string;
  systemId: string;
  dhwDemand: number; // kWh/m2/yr
  spaceHeatingDemand: number; // kWh/m2/yr
  totalHeatingDemand: number; // kWh/m2/yr
  freshAirRequirement: number; // m3
  operationalCo2: number; // kg/m2/yr
  primaryEnergyDemand: number; // kWh/m2/yr
  generationEnergy: number; // kWh/m2/yr
  electricityTariff: number; // EUR
  glazingUValue: number;
  wallUValue: number;
  floorUValue: number;
  roofUValue: number;
  lastModified: number;
};

const getEnergyEntry = (fieldName: string, records: Array<any>): number => {
  return pipe(
    records,
    A.findFirstMap((record) =>
      record.fields["Field"] === fieldName
        ? O.some(record.fields["SWC_constants"])
        : O.none
    ),
    O.getOrElse(() => 0)
  );
};

export const energyInfosQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};
  return pipe(
    systemIds,
    A.map((systemId) =>
      airtable
        .base(systemFromId(systemId)?.airtableId ?? "")
        .table("energy_calculator")
        .select()
        .all()
        .then((records: any) => {
          // TODO: FIXME: PLEASE :-)
          const id: string = records.map((x: any) => x.id).join("");

          const energyInfo: EnergyInfo = {
            id,
            systemId,
            dhwDemand: getEnergyEntry("DHW demand", records),
            spaceHeatingDemand: getEnergyEntry("Space Heating Demand", records),
            totalHeatingDemand: getEnergyEntry("Total Heating Demand", records),
            freshAirRequirement: getEnergyEntry(
              "Fresh Air Requirment",
              records
            ),
            operationalCo2: getEnergyEntry("Operational Co2", records),
            primaryEnergyDemand: getEnergyEntry(
              "Primary Energy Demand ",
              records
            ),
            generationEnergy: getEnergyEntry("Generation Energy", records),
            electricityTariff: getEnergyEntry("Electricity tariff", records),
            glazingUValue: getEnergyEntry("Glazing u-value", records),
            wallUValue: getEnergyEntry("Wall u-value", records),
            floorUValue: getEnergyEntry("Floor u-value", records),
            roofUValue: getEnergyEntry("Roof u-value", records),
            lastModified: Date.now(),
          };

          return energyInfo;
        })
    ),
    (ps) => Promise.all(ps)
  );
};

export const remoteEnergyInfosTE: TE.TaskEither<Error, EnergyInfo[]> =
  TE.tryCatch(
    () => energyInfosQuery(),
    (reason) =>
      new Error(
        `Failed to fetch energy infos: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

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
