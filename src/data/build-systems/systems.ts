import { z } from "zod";
import config from "@@/buildx.config.json";

export type System = {
  id: string;
  name: string;
  airtableId: string;
};

export const systems: Array<System> = z
  .array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      airtableId: z.string().min(1),
    })
  )
  .parse(config.systems);

export const systemFromId = (id: string) =>
  systems.find((x) => x.id === id) ?? null;

export const systemIdParser = z.object({
  systemId: z.string().min(1),
});

export const allSystemIds: string[] = config.systems.map(
  (system: System) => system.id
);

export const systemIdsParser = z
  .object({
    systemIds: z.array(z.string().min(1)),
  })
  .default({ systemIds: allSystemIds });
