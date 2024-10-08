import airtable, { tryCatchImageBlob } from "@/utils/airtable";
import { A, runUntilFirstSuccess, someOrError, TE } from "@/utils/functions";
import { QueryParams } from "airtable/lib/query_params";
import { useLiveQuery } from "dexie-react-hooks";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import buildSystemsCache, { BlobbedImage } from "./cache";
import { allSystemIds, systemFromId } from "./systems";

export interface BuildMaterial {
  id: string;
  systemId: string;
  specification: string;
  defaultFor: Array<string>;
  optionalFor: Array<string>;
  imageUrl: string;
  linkUrl?: string;
  defaultColor: string;
  costPerUnit: number;
  embodiedCarbonPerUnit: number; // kg
  unit: string | null;
  lastModified: number;
}

export type CachedBuildMaterial = BlobbedImage<BuildMaterial>;

export const materialSelector: QueryParams<unknown> = {
  // filterByFormula: 'OR(IFC_model!="",GLB_model!="")',
  filterByFormula: 'AND(specification!="", default_colour!="")',
};

export const materialParser = z
  .object({
    id: z.string().min(1),
    fields: z.object({
      specification: z.string().min(1),
      default_material_for: z.array(z.string().min(1)).default([]),
      optional_material_for: z.array(z.string().min(1)).default([]),
      default_colour: z.string().min(1).default(""),
      material_image: z
        .array(
          z.object({
            url: z.string().min(1),
          })
        )
        .default([]),
      material_cost_per_unit: z.number().default(0),
      embodied_carbon_per_unit: z.number().default(0),
      link_url: z.string().optional(),
      unit: z.string().nullable().default(null),
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
  })
  .transform(
    ({
      id,
      fields: {
        specification,
        default_material_for,
        optional_material_for,
        material_image,
        default_colour,
        material_cost_per_unit,
        embodied_carbon_per_unit,
        link_url,
        unit,
        last_modified,
      },
    }) => ({
      id,
      specification,
      defaultFor: default_material_for ?? [],
      optionalFor: optional_material_for ?? [],
      imageUrl: material_image?.[0]?.url,
      defaultColor: default_colour,
      costPerUnit: material_cost_per_unit,
      embodiedCarbonPerUnit: embodied_carbon_per_unit,
      linkUrl: link_url,
      unit,
      lastModified: last_modified,
    })
  );

export const materialsQuery = (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      pipe(
        airtable
          .base(systemFromId(systemId)?.airtableId ?? "")
          .table("materials_menu")
          .select(materialSelector)
          .all()
          .then(
            z.array(materialParser.transform((xs) => ({ ...xs, systemId })))
              .parse
          )
      )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteMaterialsTE: TE.TaskEither<Error, BuildMaterial[]> =
  TE.tryCatch(
    () => materialsQuery(),
    (reason) =>
      new Error(
        `Failed to fetch materials: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export class MaterialNotFoundError extends Error {
  constructor(public elementName: string, public systemId: string) {
    super(`No material found for ${elementName} in system ${systemId}`);
    this.name = "MaterialNotFoundError";
  }
}

let memMaterials: CachedBuildMaterial[] = [];

export const localMaterialsTE: TE.TaskEither<Error, CachedBuildMaterial[]> =
  TE.tryCatch(
    () => {
      if (memMaterials.length > 0) {
        // Return materials from in-memory cache
        return Promise.resolve(memMaterials);
      } else {
        // Fallback to Dexie.js cache
        return buildSystemsCache.materials.toArray().then((materials) => {
          if (A.isEmpty(materials)) {
            throw new Error("No materials found in cache");
          }
          memMaterials = materials;
          return materials;
        });
      }
    },
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedMaterialsTE = runUntilFirstSuccess([
  localMaterialsTE,
  pipe(
    remoteMaterialsTE,
    TE.chain((remoteMaterials) =>
      pipe(
        remoteMaterials,
        A.traverse(TE.ApplicativePar)(({ imageUrl, ...material }) =>
          pipe(
            tryCatchImageBlob(imageUrl),
            TE.map((imageBlob) => ({ ...material, imageBlob }))
          )
        ),
        TE.map((materials) => {
          buildSystemsCache.materials.bulkPut(materials);
          return materials;
        })
      )
    )
  ),
]);

export const useBuildMaterials = (): CachedBuildMaterial[] =>
  useLiveQuery(() => buildSystemsCache.materials.toArray(), [], []);

export const unsafeGetMaterialBySpec = (spec: string) =>
  pipe(
    memMaterials,
    A.findFirst((x) => x.specification === spec),
    someOrError(`Material not found for spec: ${spec}`)
  );
