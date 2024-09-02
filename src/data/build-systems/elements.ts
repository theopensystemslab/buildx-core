import airtable from "@/utils/airtable";
import {
  A,
  E,
  runUntilFirstSuccess,
  someOrError,
  TE,
  unwrapTaskEither,
} from "@/utils/functions";
import { useLiveQuery } from "dexie-react-hooks";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import buildSystemsCache from "./cache";
import { cachedMaterialsTE } from "./materials";
import { allSystemIds, systemFromId } from "./systems";

export type BuildElement = {
  id: string;
  systemId: string;
  name: string;
  ifcTag: string;
  defaultMaterial: string;
  materialOptions: Array<string>;
  category: string;
  lastModified: number;
};

export const elementParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    element_code: z
      .string()
      .min(1)
      .transform((s) => s.trim()),
    ifc4_variable: z.string().min(1),
    default_material: z.array(z.string().min(1)).optional(),
    element_category: z.string().min(1),
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

export const elementsQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  const materials = await unwrapTaskEither(cachedMaterialsTE); // await materialsQuery({ systemIds });

  return pipe(
    systemIds,
    A.map((systemId) =>
      pipe(
        airtable
          .base(systemFromId(systemId)?.airtableId ?? "")
          .table("building_elements")
          .select()
          .all()
          .then(
            z.array(
              elementParser.transform(
                ({
                  id,
                  fields: {
                    element_code,
                    ifc4_variable,
                    element_category,
                    last_modified,
                  },
                }) => {
                  const defaultMaterials = materials.filter(({ defaultFor }) =>
                    defaultFor.includes(id)
                  );
                  const optionalMaterials = materials.filter(
                    ({ optionalFor }) => optionalFor.includes(id)
                  );
                  const defaultMaterial =
                    defaultMaterials[0]?.specification ||
                    optionalMaterials[0]?.specification ||
                    "";
                  const materialOptions = optionalMaterials.map(
                    (material) => material.specification
                  );

                  return {
                    id,
                    systemId,
                    name: element_code,
                    ifcTag: ifc4_variable.toUpperCase(),
                    defaultMaterial,
                    materialOptions,
                    category: element_category,
                    lastModified: last_modified,
                  };
                }
              )
            ).parse
          )
      )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteElementsTE: TE.TaskEither<Error, BuildElement[]> =
  TE.tryCatch(
    () => elementsQuery(),
    (reason) =>
      new Error(
        `Failed to fetch elements: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      )
  );

export class ElementNotFoundError extends Error {
  constructor(public elementName: string, public systemId: string) {
    super(`No element found for ${elementName} in system ${systemId}`);
    this.name = "ElementNotFoundError";
  }
}

let memElements: BuildElement[] = [];

export const localElementsTE: TE.TaskEither<Error, BuildElement[]> =
  TE.tryCatch(
    () => {
      if (memElements.length > 0) {
        // Return elements from in-memory cache
        return Promise.resolve(memElements);
      } else {
        // Fallback to Dexie.js cache
        return buildSystemsCache.elements.toArray().then((elements) => {
          if (A.isEmpty(elements)) {
            throw new Error("No elements found");
          }
          // Update in-memory cache
          memElements = elements;
          return elements;
        });
      }
    },
    (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
  );

export const cachedElementsTE = runUntilFirstSuccess([
  localElementsTE,
  pipe(
    remoteElementsTE,
    TE.map((elements) => {
      buildSystemsCache.elements.bulkPut(elements);
      // Update in-memory cache
      memElements = elements;
      return elements;
    })
  ),
]);

export const useBuildElements = (): BuildElement[] =>
  useLiveQuery(() => buildSystemsCache.elements.toArray(), [], []);

export const elementGetterTE = pipe(
  cachedElementsTE,
  TE.map(
    (elements) =>
      ({ systemId, ifcTag }: { systemId: string; ifcTag: string }) =>
        pipe(
          elements,
          A.findFirst<BuildElement>(
            (x) => x.systemId === systemId && x.ifcTag === ifcTag
          ),
          E.fromOption(() => Error(`no ${ifcTag} element found in ${systemId}`))
        )
  )
);

// Add a utility function to get a single element by IFC tag
export const unsafeGetElementByIfcTag = (ifcTag: string): BuildElement => {
  return pipe(
    memElements,
    A.findFirst((x) => x.ifcTag === ifcTag),
    someOrError(`no ${ifcTag} element found`)
  );
};
