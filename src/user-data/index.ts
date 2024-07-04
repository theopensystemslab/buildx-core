import Dexie from "dexie";
import { House } from "./houses";

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

export default userDB;

// export * from "./houses"
