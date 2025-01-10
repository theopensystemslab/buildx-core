import airtable from "@/utils/airtable";
import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

export type LabourType = {
  id: string;
  systemId: string;
  name: string;
  type: string;
  minLabourCost: number;
  maxLabourCost: number;
  unit: string;
  lastModified: number;
};

export const labourTypeParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    Name: z.string().min(1),
    Type: z.string().min(1),
    min_labour_cost: z.number().default(0),
    max_labour_cost: z.number().default(0),
    unit: z.string().min(1),
    last_modified: z
      .string()
      .refine(
        (value) => {
          const date = new Date(value);
          return !isNaN(date.getTime());
        },
        {
          message: "Invalid date string",
        }
      )
      .transform((x) => new Date(x).getTime()),
  }),
});

export const labourTypesQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      pipe(
        airtable
          .base(systemFromId(systemId)?.airtableId ?? "")
          .table("labour_menu")
          .select()
          .all()
          .then(
            z.array(
              labourTypeParser.transform(
                ({
                  id,
                  fields: {
                    Name,
                    Type,
                    min_labour_cost,
                    max_labour_cost,
                    unit,
                    last_modified,
                  },
                }): LabourType => ({
                  id,
                  systemId,
                  name: Name,
                  type: Type,
                  minLabourCost: min_labour_cost,
                  maxLabourCost: max_labour_cost,
                  unit,
                  lastModified: last_modified,
                })
              )
            ).parse
          )
      )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteLabourTypesTE: TE.TaskEither<Error, LabourType[]> =
  TE.tryCatch(
    () => labourTypesQuery(),
    (reason) =>
      new Error(
        `Failed to fetch labour types: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export const localLabourTypesTE: TE.TaskEither<Error, LabourType[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.labourTypes.toArray().then((labourTypes) => {
        if (A.isEmpty(labourTypes)) {
          throw new Error("No labour types found in cache");
        }
        return labourTypes;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedLabourTypesTE = runUntilFirstSuccess([
  localLabourTypesTE,
  pipe(
    remoteLabourTypesTE,
    TE.map((labourTypes) => {
      buildSystemsCache.labourTypes.bulkPut(labourTypes);
      return labourTypes;
    })
  ),
]);

export const useLabourTypes = (): LabourType[] =>
  useLiveQuery(() => buildSystemsCache.labourTypes.toArray(), [], []);
