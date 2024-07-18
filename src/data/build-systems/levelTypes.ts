import airtable from "@/utils/airtable";
import { flow, pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

export interface LevelType {
  id: string;
  systemId: string;
  code: string;
  description: string;
  lastModified: number;
  height: number;
}

export const levelTypeParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    level_code: z.string().min(1),
    description: z.string().min(1),
    last_modified: z.string().refine(
      (value) => {
        // Attempt to parse the value as a date and check that it's valid
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
      {
        // Custom error message
        message: "Invalid date string",
      }
    ),
    level_height: z.number(),
  }),
});

export const levelTypesQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      airtable
        .base(systemFromId(systemId)?.airtableId ?? "")
        .table("level_type")
        .select()
        .all()
        .then(
          z.array(
            levelTypeParser.transform(
              ({
                id,
                fields: {
                  level_code,
                  description,
                  last_modified,
                  level_height,
                },
              }): LevelType => ({
                id,
                systemId,
                code: level_code,
                description,
                lastModified: new Date(last_modified).getTime(),
                height: level_height,
              })
            )
          ).parse
        )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteLevelTypesTE: TE.TaskEither<Error, LevelType[]> =
  TE.tryCatch(
    () => levelTypesQuery(),
    (reason) =>
      new Error(
        `Failed to fetch level types: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export const localLevelTypesTE: TE.TaskEither<Error, LevelType[]> = TE.tryCatch(
  () =>
    buildSystemsCache.levelTypes.toArray().then((levelTypes) => {
      if (A.isEmpty(levelTypes)) {
        throw new Error("No modules found in cache");
      }
      return levelTypes;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedLevelTypesTE = runUntilFirstSuccess([
  localLevelTypesTE,
  pipe(
    remoteLevelTypesTE,
    TE.map((levelTypes) => {
      buildSystemsCache.levelTypes.bulkPut(levelTypes);
      return levelTypes;
    })
  ),
]);

export const useLevelTypes = (): LevelType[] =>
  useLiveQuery(() => buildSystemsCache.levelTypes.toArray(), [], []);

export const getLevelType = ({
  systemId,
  code,
}: {
  systemId: string;
  code: string;
}) =>
  pipe(
    cachedLevelTypesTE,
    TE.chain(
      flow(
        A.findFirst((x) => x.code === code && x.systemId === systemId),
        TE.fromOption(
          () => new Error(`no section type found for ${code} in ${systemId}`)
        )
      )
    )
  );
