import { flow, pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import airtable, { tryCatchImageBlob } from "@/utils/airtable";
import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import buildSystemsCache, { BlobbedImage } from "./cache";
import { useLiveQuery } from "dexie-react-hooks";

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

export type CachedWindowType = BlobbedImage<WindowType>;

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
        `Failed to fetch window types: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export const localWindowTypesTE: TE.TaskEither<Error, CachedWindowType[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.windowTypes.toArray().then((windowTypes) => {
        if (A.isEmpty(windowTypes)) {
          throw new Error("No window types found in cache");
        }
        return windowTypes;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedWindowTypesTE = runUntilFirstSuccess([
  localWindowTypesTE,
  pipe(
    remoteWindowTypesTE,
    TE.chain((remoteWindowTypes) =>
      pipe(
        remoteWindowTypes,
        A.traverse(TE.ApplicativePar)(({ imageUrl, ...windowType }) =>
          pipe(
            tryCatchImageBlob(imageUrl),
            TE.map((imageBlob) => ({ ...windowType, imageBlob }))
          )
        ),
        TE.map((materials) => {
          buildSystemsCache.windowTypes.bulkPut(materials);
          return materials;
        })
      )
    )
  ),
]);

export const useWindowTypes = (): CachedWindowType[] =>
  useLiveQuery(() => buildSystemsCache.windowTypes.toArray(), [], []);

export const getWindowType = ({
  systemId,
  code,
}: {
  systemId: string;
  code: string;
}) =>
  pipe(
    cachedWindowTypesTE,
    TE.chain(
      flow(
        A.findFirst((x) => x.code === code && x.systemId === systemId),
        TE.fromOption(
          () => new Error(`no window type found for ${code} in ${systemId}`)
        )
      )
    )
  );
