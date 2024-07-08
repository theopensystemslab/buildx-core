import Dexie from "dexie";
import { House } from "./houses";
import { E, TE } from "@/utils/functions";

const PROJECT_DATA_KEY = "PROJECT_DATA_KEY";

type ProjectData = {
  key: typeof PROJECT_DATA_KEY;
  projectName: string;
  region: "UK" | "EU";
};

class UserDatabase extends Dexie {
  houses: Dexie.Table<House, string>;
  projectData: Dexie.Table<ProjectData, string>;

  constructor() {
    super("UserDatabase");
    this.version(1).stores({
      houses: "houseId,&friendlyName",
      projectData: "&key",
      // orderListRows: "[houseId+blockName]",
      // materialsListRows: "[houseId+item]",
    });
    this.houses = this.table("houses");
    this.projectData = this.table("projectData");
  }
}

const userDB = new UserDatabase();

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
// export * from "./houses"

export default userDB;
