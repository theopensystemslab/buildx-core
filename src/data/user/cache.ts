import Dexie from "dexie";
import { Polygon } from "geojson";
import { House } from "./houses";

export const PROJECT_DATA_KEY = "PROJECT_DATA_KEY";

export type ProjectData = {
  key: typeof PROJECT_DATA_KEY;
  projectName: string;
  region: "UK" | "EU";
  polygon: Polygon | null;
  shareUrlPayload: string | null;
  lastSaved: number | null;
};

export const defaultProjectData: ProjectData = {
  key: PROJECT_DATA_KEY,
  projectName: "New Project",
  region: "UK",
  polygon: null,
  shareUrlPayload: null,
  lastSaved: null,
};

export const getDefaultProjectData = (): ProjectData => {
  return {
    ...defaultProjectData,
    lastSaved: Date.now(),
  };
};

export const updateProjectData = (
  changes: Partial<Omit<ProjectData, "lastSaved">> = {}
) => {
  const now = Date.now();

  userCache.projectData.update(PROJECT_DATA_KEY, {
    ...changes,
    lastSaved: now,
  });
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

// Initialize default data when database is created
(async () => {
  const existing = await userCache.projectData.get(PROJECT_DATA_KEY);
  if (!existing) {
    await userCache.projectData.put(getDefaultProjectData());
  }
})();

export default userCache;
