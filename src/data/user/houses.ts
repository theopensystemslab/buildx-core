import { A, E, R, TE } from "@/utils/functions";
import { useLiveQuery } from "dexie-react-hooks";
import { pipe } from "fp-ts/lib/function";
import { z } from "zod";
import userCache, { updateProjectData } from "./cache";

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
  pipe(localHousesTE, TE.map(getFriendlyName));

export type House = z.infer<typeof houseParser>;

export const createCachedHouse =
  (house: House): TE.TaskEither<Error, House> =>
  () =>
    userCache.houses
      .put(house)
      .then(() => E.right(house))
      .catch(E.left);

export const deleteCachedHouse =
  (houseId: string): TE.TaskEither<Error, string> =>
  () =>
    userCache.houses
      .delete(houseId)
      .then(() => E.right(houseId))
      .catch(E.left);

export const updateCachedHouse =
  (houseId: string, changes: Partial<House>): TE.TaskEither<Error, string> =>
  () =>
    userCache.houses
      .update(houseId, changes)
      .then(() => E.right(houseId))
      .catch(E.left);

export const localHousesTE: TE.TaskEither<Error, Array<House>> = () =>
  userCache.houses.toArray().then(E.right).catch(E.left);

export const defaultCachedHousesOps = {
  onHouseCreate: async (house: House) => {
    await createCachedHouse(house)();
    updateProjectData();
  },
  onHouseUpdate: async (houseId: string, changes: Partial<House>) => {
    await updateCachedHouse(houseId, changes)();
    updateProjectData();
  },
  onHouseDelete: async (houseId: string) => {
    await deleteCachedHouse(houseId)();
    updateProjectData();
  },
};

export const housesToRecord = <T extends House>(
  housesArray: T[]
): Record<string, T> => {
  return pipe(
    housesArray,
    A.reduce({} as Record<string, T>, (acc, house) => ({
      ...acc,
      [house.houseId]: house,
    }))
  );
};

export const housesToArray = (housesRecord: Record<string, House>): House[] => {
  return pipe(
    housesRecord,
    R.toArray,
    A.map(([, house]) => house) // We only care about the House value, not the houseId key.
  );
};

export const useHouses = (): House[] =>
  useLiveQuery(() => userCache.houses.toArray(), [], []);

export const setHouses = (houses: House[]) => {
  userCache.houses.clear().then(() => {
    userCache.houses.bulkPut(houses);
  });
};
