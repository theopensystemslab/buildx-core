import * as z from "zod";
import { pipe } from "fp-ts/lib/function";
import { allSystemIds, systemFromId } from "./systems";
import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import airtable from "@/utils/airtable";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

type ClampedDimension = {
  min: number;
  max: number;
  units: string;
};

export interface SystemSettings {
  systemId: string;
  length: ClampedDimension;
  height: ClampedDimension;
  lastModified: number;
}

export const systemSettingsParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    Field: z.string().min(1),
    units: z.string().min(1),
    minimum: z.number(),
    maximum: z.number(),
    last_modified: z
      .string()
      .refine(
        (value) => {
          // Attempt to parse the value as a date and check that it's valid
          const date = new Date(value);
          return !isNaN(date.getTime());
        },
        {
          // Custom error message
          message: "Invalid date string",
        }
      )
      .transform((x) => new Date(x).getTime()),
  }),
});

export const systemSettingsQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      airtable
        .base(systemFromId(systemId)?.airtableId ?? "")
        .table("system_settings")
        .select()
        .all()
        .then((res) => {
          const parsley = z
            .array(
              systemSettingsParser.transform(
                ({
                  id,
                  fields: { Field, units, minimum, maximum, last_modified },
                }) => ({
                  id,
                  Field,
                  minimum,
                  maximum,
                  units,
                  lastModified: last_modified,
                })
              )
            )
            .parse(res);

          const bar = parsley.reduce(
            (acc, { Field, units, minimum, maximum, lastModified }) => ({
              ...acc,
              systemId,
              [Field]: {
                units,
                min: minimum,
                max: maximum,
                lastModified,
              },
            }),
            {} as SystemSettings
          );

          return bar;
        })
    ),
    (ps) => Promise.all(ps)
  );
};

export const remoteSystemSettingsTE: TE.TaskEither<Error, SystemSettings[]> =
  TE.tryCatch(
    () => systemSettingsQuery(),
    (reason) =>
      new Error(
        `Failed to fetch system settings: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

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
