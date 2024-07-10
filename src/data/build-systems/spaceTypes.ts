import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import airtable from "@/utils/airtable";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

export type SpaceType = {
  id: string;
  systemId: string;
  code: string;
  description: string;
  lastModified: number;
};

export const spaceTypeParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    space_code: z.string().min(1),
    description: z.string().min(1),
    image: z
      .array(
        z.object({
          url: z.string().min(1),
        })
      )
      .default([]),
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

export const spaceTypesQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      airtable
        .base(systemFromId(systemId)?.airtableId ?? "")
        .table("space_type")
        .select()
        .all()
        .then(
          z.array(
            spaceTypeParser.transform(
              ({
                id,
                fields: { space_code, description, last_modified },
              }): SpaceType => ({
                id,
                systemId,
                code: space_code,
                description,
                lastModified: new Date(last_modified).getTime(),
              })
            )
          ).parse
        )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteSpaceTypesTE: TE.TaskEither<Error, SpaceType[]> =
  TE.tryCatch(
    () => spaceTypesQuery(),
    (reason) =>
      new Error(
        `Failed to fetch space types: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export const localSpaceTypesTE: TE.TaskEither<Error, SpaceType[]> = TE.tryCatch(
  () =>
    buildSystemsCache.spaceTypes.toArray().then((spaceTypes) => {
      if (A.isEmpty(spaceTypes)) {
        throw new Error("No spaceTypes found in cache");
      }
      return spaceTypes;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedSpaceTypesTE = runUntilFirstSuccess([
  localSpaceTypesTE,
  pipe(
    remoteSpaceTypesTE,
    TE.map((spaceTypes) => {
      buildSystemsCache.spaceTypes.bulkPut(spaceTypes);
      return spaceTypes;
    })
  ),
]);

export const useSpaceTypes = (): SpaceType[] =>
  useLiveQuery(() => buildSystemsCache.spaceTypes.toArray(), [], []);
