import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import { flow, pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import airtable from "@/utils/airtable";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

export type SectionType = {
  id: string;
  systemId: string;
  code: string;
  description: string;
  width: number;
  lastModified: number;
};

export const sectionTypeParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    section_code: z.string().min(1),
    description: z.string().default(""),
    section_width: z.number(),
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

export const sectionTypesQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      airtable
        .base(systemFromId(systemId)?.airtableId ?? "")
        .table("section_type")
        .select()
        .all()
        .then(
          z.array(
            sectionTypeParser.transform(
              ({
                id,
                fields: {
                  section_code,
                  description,
                  section_width,
                  last_modified: lastModified,
                },
              }) => ({
                id,
                systemId,
                code: section_code,
                description,
                width: section_width,
                lastModified,
              })
            )
          ).parse
        )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteSectionTypesTE: TE.TaskEither<Error, SectionType[]> =
  TE.tryCatch(
    () => sectionTypesQuery(),
    (reason) =>
      new Error(
        `Failed to fetch section types: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export const localSectionTypesTE: TE.TaskEither<Error, SectionType[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.sectionTypes.toArray().then((sectionTypes) => {
        if (A.isEmpty(sectionTypes)) {
          throw new Error("No modules found in cache");
        }
        return sectionTypes;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedSectionTypesTE = runUntilFirstSuccess([
  localSectionTypesTE,
  pipe(
    remoteSectionTypesTE,
    TE.map((sectionTypes) => {
      buildSystemsCache.sectionTypes.bulkPut(sectionTypes);
      return sectionTypes;
    })
  ),
]);

export const useSectionTypes = (): SectionType[] =>
  useLiveQuery(() => buildSystemsCache.sectionTypes.toArray(), [], []);

export const getSectionType = ({
  systemId,
  code,
}: {
  systemId: string;
  code: string;
}) =>
  pipe(
    cachedSectionTypesTE,
    TE.chain(
      flow(
        A.findFirst((x) => x.code === code && x.systemId === systemId),
        TE.fromOption(
          () => new Error(`no section type found for ${code} in ${systemId}`)
        )
      )
    )
  );
