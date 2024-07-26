import Dexie from "dexie";
import { House } from "./houses";
import { Polygon } from "geojson";

export const PROJECT_DATA_KEY = "PROJECT_DATA_KEY";

export type ProjectData = {
  key: typeof PROJECT_DATA_KEY;
  projectName: string;
  region: "UK" | "EU";
  polygon: Polygon | null;
  shareUrlPayload: string | null;
};

export const defaultProjectData: ProjectData = {
  key: PROJECT_DATA_KEY,
  projectName: "My BuildX Project",
  region: "UK",
  polygon: null,
  shareUrlPayload: null,
};

class UserCache extends Dexie {
  houses: Dexie.Table<House, string>;
  projectData: Dexie.Table<ProjectData, string>;

  constructor() {
    super("UserCache");
    this.version(1).stores({
      houses: "houseId,&friendlyName",
      projectData: "&key",
    });
    this.houses = this.table("houses");
    this.projectData = this.table("projectData");
  }
}

const userCache = new UserCache();

userCache.projectData.get(PROJECT_DATA_KEY).then((x) => {
  if (typeof x === "undefined") {
    userCache.projectData.put(defaultProjectData);
  }
});

export default userCache;
