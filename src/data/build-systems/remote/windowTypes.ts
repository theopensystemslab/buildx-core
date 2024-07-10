import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import airtable from "@/utils/airtable";
import { A, TE } from "@/utils/functions";

export type WindowType = {
  id: string;
  systemId: string;
  code: string;
  description: string;
  imageUrl: string;
  glazingArea: number;
  doorArea: number;
  openingPerimeter: number;
  lastModified: number;
};

export const windowTypeParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    opening_set: z.string().min(1),
    description: z.string().min(1),
    image: z
      .array(
        z.object({
          url: z.string().min(1),
        })
      )
      .default([]),
    glazing_area: z.number().default(0),
    opening_perimeter: z.number().default(0),
    door_area: z.number().default(0),
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
  }),
});

export const windowTypesQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      airtable
        .base(systemFromId(systemId)?.airtableId ?? "")
        .table("window_type")
        .select()
        .all()
        .then(
          z.array(
            windowTypeParser.transform(
              ({
                id,
                fields: {
                  opening_set,
                  description,
                  image,
                  glazing_area,
                  opening_perimeter: openingPerimeter,
                  door_area: doorArea,
                  last_modified,
                },
              }): WindowType => ({
                id,
                systemId,
                code: opening_set,
                description,
                imageUrl: image?.[0]?.url,
                glazingArea: glazing_area,
                openingPerimeter,
                doorArea,
                lastModified: new Date(last_modified).getTime(),
              })
            )
          ).parse
        )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteWindowTypesTE: TE.TaskEither<Error, WindowType[]> =
  TE.tryCatch(
    () => windowTypesQuery(),
    (reason) =>
      new Error(
        `Failed to fetch elements: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );
