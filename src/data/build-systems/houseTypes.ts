import { dnasToModules, modulesToColumns, modulesToRows } from "@/layouts/init";
import airtable, { tryCatchImageBlob } from "@/utils/airtable";
import {
  A,
  O,
  runUntilFirstSuccess,
  TE,
  unwrapTaskEither,
} from "@/utils/functions";
import { QueryParams } from "airtable/lib/query_params";
import { useLiveQuery } from "dexie-react-hooks";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import buildSystemsCache, { BlobbedImage } from "./cache";
import { BuildModule, cachedModulesTE } from "./modules";
import { allSystemIds, systemFromId } from "./systems";

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
        image: z
          .array(
            z.object({
              url: z.string().min(1),
            })
          )
          .optional(),
        description: z.string().min(1).default("Missing description"),
        cost: z.number().default(0),
        embodied_carbon: z.number().default(0),
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
      imageUrl: image?.[0]?.url,
      description,
      cost,
      carbon: embodied_carbon,
      lastModified: new Date(last_modified).getTime(),
    })
  );

export type HouseType = z.infer<typeof houseTypeParser> & { systemId: string };

export type CachedHouseType = BlobbedImage<HouseType>;

export const validateColumns = (columns: BuildModule[][][]): boolean => {
  return pipe(
    columns,
    A.map((column) =>
      pipe(
        column,
        A.map((module) =>
          pipe(
            module,
            A.reduce(0, (b, v) => b + v.structuredDna.gridUnits)
          )
        ),
        A.reduce(
          { acc: true, prev: null },
          ({ prev }: { prev: number | null }, a: number) => ({
            acc: prev === null || prev === a,
            prev: a as number | null,
          })
        ),
        ({ acc }) => acc
      )
    ),
    A.reduce(true, (b, a) => b && a)
  );
};

export const validateRows = (rows: BuildModule[][]): boolean => {
  return rows.every((row) => {
    // Check if row starts and ends with END position type
    if (
      row[0]?.structuredDna.positionType !== "END" ||
      row[row.length - 1]?.structuredDna.positionType !== "END"
    ) {
      return false;
    }

    // Check if all middle modules are MID position type
    const middleModules = row.slice(1, -1);
    if (!middleModules.every((m) => m.structuredDna.positionType === "MID")) {
      return false;
    }

    // Check if all modules in row have same levelType and sectionType
    const firstModule = row[0];
    return row.every(
      (module) =>
        module.structuredDna.levelType ===
          firstModule.structuredDna.levelType &&
        module.structuredDna.sectionType ===
          firstModule.structuredDna.sectionType
    );
  });
};

export const validateHouseType = (modules: BuildModule[]): boolean => {
  const rows = modulesToRows(modules);
  const columns = modulesToColumns(modules);
  return validateRows(rows) && validateColumns(columns);
};

export const houseTypesQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  const buildModules = await unwrapTaskEither(cachedModulesTE);

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

      const systemHouseTypes = await pipe(
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
                A.filterMap((modulesByHouseTypeId) =>
                  pipe(
                    modulesByHouseType,
                    A.findFirstMap((x) =>
                      x.id === modulesByHouseTypeId
                        ? O.some(x.fields.module_code[0])
                        : O.none
                    )
                  )
                )
              ),
              ...rest,
            }))
          )
      );

      return pipe(
        systemHouseTypes,
        A.filter((systemHouseType) => {
          const { dnas } = systemHouseType;

          const modules = dnasToModules({ systemId, buildModules })(dnas);

          return validateHouseType(modules);
        })
      );
    }),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteHouseTypesTE: TE.TaskEither<Error, HouseType[]> =
  TE.tryCatch(
    () => houseTypesQuery(),
    (reason) => {
      console.error("Remote house types fetch failed:", reason);
      return new Error(
        `Failed to fetch house types: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      );
    }
  );

export const localHouseTypesTE: TE.TaskEither<Error, CachedHouseType[]> =
  TE.tryCatch(
    async () => {
      const types = await buildSystemsCache.houseTypes.toArray();
      if (A.isEmpty(types)) {
        throw new Error("No house types found in cache");
      }
      return types;
    },
    (reason) => {
      console.error("Local house types fetch failed:", reason);
      return reason instanceof Error ? reason : new Error(String(reason));
    }
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
