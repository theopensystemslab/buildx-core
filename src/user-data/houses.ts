import { E, TE } from "@/utils/functions";
import { z } from "zod";
import userDB from ".";

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

export type House = z.infer<typeof houseParser>;

export const saveHouse =
  (house: House): TE.TaskEither<Error, House> =>
  () =>
    userDB.houses
      .put(house)
      .then(() => E.right(house))
      .catch(E.left);

export const deleteHouse =
  (house: House): TE.TaskEither<Error, House> =>
  () =>
    userDB.houses
      .delete(house.houseId)
      .then(() => E.right(house))
      .catch(E.left);

export const updateHouse =
  (houseId: string, changes: Partial<House>): TE.TaskEither<Error, string> =>
  () =>
    userDB.houses
      .update(houseId, changes)
      .then(() => E.right(houseId))
      .catch(E.left);

export const cachedHousesTE: TE.TaskEither<Error, Array<House>> = () =>
  userDB.houses.toArray().then(E.right).catch(E.left);
