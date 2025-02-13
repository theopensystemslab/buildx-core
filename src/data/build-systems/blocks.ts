import airtable, { tryCatchImageBlob } from "@/utils/airtable";
import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache, { BlobbedImage } from "./cache";

export type Block = {
  id: string;
  systemId: string;
  name: string;
  sheetQuantity: number;
  materialsCost: number; // -> material cost
  manufacturingCost: number; // -> manufacturer cost
  totalCost: number;
  cuttingFileUrl: string;
  lastModified: number;
  embodiedCarbonGwp: number;
  imageUrl?: string;
};

export const blockTypeParser = z.object({
  id: z.string().min(1),
  fields: z.object({
    Name: z.string().min(1),
    "Sheet Quantity": z.number().default(1),
    Materials_cost: z.number().default(0),
    Manufacturing_cost: z.number().default(0),
    Total_cost: z.number().default(0),
    Github_cutting_file: z.string().min(1),
    "Last Modified": z
      .string()
      .refine(
        (value) => {
          const date = new Date(value);
          return !isNaN(date.getTime());
        },
        {
          message: "Invalid date string",
        }
      )
      .transform((x) => new Date(x).getTime()),
    "Main image": z
      .array(z.object({ url: z.string().min(1) }))
      .optional()
      .default([]),
    "Embodied carbon GWP (kgCO2 eq.)": z.number().default(0),
  }),
});

export const blocksQuery = async (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      pipe(
        airtable
          .base(systemFromId(systemId)?.airtableId ?? "")
          .table("All blocks")
          .select()
          .all()
          .then(
            z.array(
              blockTypeParser.transform(
                ({
                  id,
                  fields: {
                    Name: name,
                    "Sheet Quantity": sheetQuantity,
                    Materials_cost: materialsCost,
                    Manufacturing_cost: manufacturingCost,
                    Total_cost: totalCost,
                    Github_cutting_file,
                    "Last Modified": lastModified,
                    "Main image": image,
                    "Embodied carbon GWP (kgCO2 eq.)": embodiedCarbonGwp,
                  },
                }): Block => ({
                  id,
                  systemId,
                  name,
                  sheetQuantity,
                  materialsCost,
                  manufacturingCost,
                  totalCost,
                  cuttingFileUrl: Github_cutting_file,
                  lastModified,
                  imageUrl: image[0]?.url, // Use optional chaining here
                  embodiedCarbonGwp,
                })
              )
            ).parse
          )
      )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteBlocksTE: TE.TaskEither<Error, Block[]> = TE.tryCatch(
  () => blocksQuery(),
  (reason) =>
    new Error(
      `Failed to fetch blocks: ${
        reason instanceof Error ? reason.message : String(reason)
      }`
    )
);

export const localBlocksTE: TE.TaskEither<Error, CachedBlock[]> = TE.tryCatch(
  () =>
    buildSystemsCache.blocks.toArray().then((blocks) => {
      if (A.isEmpty(blocks)) {
        throw new Error("No blocks found in cache");
      }
      return blocks;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedBlocksTE: TE.TaskEither<Error, CachedBlock[]> =
  runUntilFirstSuccess([
    localBlocksTE,
    pipe(
      remoteBlocksTE,
      TE.chain((remoteBlocks) =>
        pipe(
          remoteBlocks,
          A.traverse(TE.ApplicativePar)(({ imageUrl, ...block }) =>
            pipe(
              tryCatchImageBlob(imageUrl),
              TE.map((imageBlob) => ({ ...block, imageBlob }))
            )
          ),
          TE.map((blocks) => {
            buildSystemsCache.blocks.bulkPut(blocks);
            return blocks;
          })
        )
      )
    ),
  ]);

export const useBlocks = (): CachedBlock[] =>
  useLiveQuery(() => buildSystemsCache.blocks.toArray(), [], []);

export type CachedBlock = BlobbedImage<Block>;
