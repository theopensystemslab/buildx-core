import { A, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { z } from "zod";
import { cachedHousesTE } from "./cache";

export const houseParser = z.object({
  houseId: z.string().min(1),
  houseTypeId: z.string().min(1),
  systemId: z.string().min(1),
  dnas: z.array(z.string().min(1)),
  activeElementMaterials: z.record(z.string().min(1)),
  friendlyName: z.string().min(1),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  rotation: z.number(),
});

export const getFriendlyName = (houses: House[]) => {
  const existingNames = pipe(
    houses,
    A.map(({ friendlyName }) => friendlyName)
  );

  let count = houses.length + 1;

  let nextName = `Building ${count}`;

  while (existingNames.includes(nextName)) {
    nextName = `Building ${++count}`;
  }

  return nextName;
};

export const getFriendlyNameTE = () =>
  pipe(cachedHousesTE, TE.map(getFriendlyName));

export type House = z.infer<typeof houseParser>;
