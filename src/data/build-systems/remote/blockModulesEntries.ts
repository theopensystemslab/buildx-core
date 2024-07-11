import { QueryParams } from "airtable/lib/query_params";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import { A, TE } from "@/utils/functions";
import airtable from "@/utils/airtable";

const selector: QueryParams<any> = {
  filterByFormula: 'AND(modules!="", block!="")',
};

export type BlockModulesEntry = {
  id: string;
  systemId: string;
  blockId: string;
  moduleIds: string[];
  lastModified: number;
};

export const blockModulesEntryParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    block: z.array(z.string().min(1)).length(1),
    modules: z.array(z.string().min(1)),
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

export const blockModulesEntriesQuery = async (input?: {
  systemIds: string[];
}) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      pipe(
        airtable
          .base(systemFromId(systemId)?.airtableId ?? "")
          .table("blocks_by_module")
          .select(selector)
          .all()
          .then(
            z.array(
              blockModulesEntryParser.transform(
                ({
                  id,
                  fields: { block, modules, last_modified: lastModified },
                }): BlockModulesEntry => ({
                  id,
                  systemId,
                  blockId: block[0],
                  moduleIds: modules,
                  lastModified,
                })
              )
            ).parse
          )
      )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteBlockModulesEntriesTE: TE.TaskEither<
  Error,
  BlockModulesEntry[]
> = TE.tryCatch(
  () => blockModulesEntriesQuery(),
  (reason) =>
    new Error(
      `Failed to fetch elements: ${
        reason instanceof Error ? reason.message : String(reason)
      }`
    )
);