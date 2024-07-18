import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import { QueryParams } from "airtable/lib/query_params";
import { filter, map } from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import airtable, { tryCatchImageBlob } from "@/utils/airtable";
import buildSystemsCache, { BlobbedImage } from "./cache";
import { useLiveQuery } from "dexie-react-hooks";

const modulesByHouseTypeSelector: QueryParams<any> = {
  filterByFormula: 'module!=""',
};

const modulesByHouseTypeParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    module_code: z.array(z.string().min(1)),
    module: z.array(z.string().min(1)),
  }),
});

export const houseTypeParser = z
  .object({
    fields: z
      .object({
        // id: z.string().min(1),
        house_type_code: z.string().min(1),
        modules: z.array(z.string().min(1)),
        image: z.array(
          z.object({
            url: z.string().min(1),
          })
        ),
        description: z.string().min(1),
        cost: z.number(),
        embodied_carbon: z.number(),
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
      })
      .passthrough(),
    id: z.string().min(1),
  })
  .transform(
    ({
      id,
      fields: {
        house_type_code,
        modules,
        image,
        description,
        cost,
        embodied_carbon,
        last_modified,
      },
    }) => ({
      id,
      name: house_type_code,
      dnas: modules,
      imageUrl: image[0].url,
      description,
      cost,
      carbon: embodied_carbon,
      lastModified: new Date(last_modified).getTime(),
    })
  );

export const houseTypesQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map(async (systemId) => {
      const system = systemFromId(systemId);
      if (system === null) throw new Error(`no system found ${systemId}`);

      const modulesByHouseType = await pipe(
        airtable
          .base(system.airtableId)
          .table("modules_by_housetype")
          .select(modulesByHouseTypeSelector)
          .all()
          .then((x) => {
            const parsed = z.array(modulesByHouseTypeParser).safeParse(x);
            if (parsed.success) return parsed.data;
            else return [];
          })
      );
      return pipe(
        airtable
          .base(system.airtableId)
          .table("house_types")
          .select()
          .all()
          .then(z.array(houseTypeParser).parse)
          .then((xs) =>
            xs.map(({ dnas, ...rest }) => ({
              systemId: system.id,
              dnas: pipe(
                dnas,
                map((modulesByHouseTypeId) => {
                  const moduleByHouseType = modulesByHouseType.find(
                    (m) => m.id === modulesByHouseTypeId
                  );
                  return moduleByHouseType?.fields.module_code[0];
                }),
                filter((x): x is string => Boolean(x))
              ),
              ...rest,
            }))
          )
      );
    }),

    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export type HouseType = z.infer<typeof houseTypeParser> & { systemId: string };

export type CachedHouseType = BlobbedImage<HouseType>;

export const remoteHouseTypesTE: TE.TaskEither<Error, HouseType[]> =
  TE.tryCatch(
    () => houseTypesQuery(),
    (reason) =>
      new Error(
        `Failed to fetch house types: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export const localHouseTypesTE: TE.TaskEither<Error, CachedHouseType[]> =
  TE.tryCatch(
    () =>
      buildSystemsCache.houseTypes.toArray().then((houseTypes) => {
        if (A.isEmpty(houseTypes)) {
          throw new Error("No house types found in cache");
        }
        return houseTypes;
      }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedHouseTypesTE: TE.TaskEither<Error, CachedHouseType[]> =
  runUntilFirstSuccess([
    localHouseTypesTE,
    pipe(
      remoteHouseTypesTE,
      TE.chain((remoteHouseTypes) =>
        pipe(
          remoteHouseTypes,
          A.traverse(TE.ApplicativePar)(({ imageUrl, ...houseType }) =>
            pipe(
              tryCatchImageBlob(imageUrl),
              TE.map((imageBlob) => ({ ...houseType, imageBlob }))
            )
          ),
          TE.map((houseTypes) => {
            buildSystemsCache.houseTypes.bulkPut(houseTypes);
            return houseTypes;
          })
        )
      )
    ),
  ]);

export const useHouseTypes = (): CachedHouseType[] => {
  const houseTypes = useLiveQuery(
    () => buildSystemsCache.houseTypes.toArray(),
    [],
    []
  );

  if (houseTypes.length === 0) {
    cachedHouseTypesTE();
  }

  return houseTypes;
};
