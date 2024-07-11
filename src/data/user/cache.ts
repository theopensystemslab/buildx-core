import { formatCurrency } from "@/utils/format";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { House } from "./houses";

const PROJECT_DATA_KEY = "PROJECT_DATA_KEY";

type ProjectData = {
  key: typeof PROJECT_DATA_KEY;
  projectName: string;
  region: "UK" | "EU";
};

const defaultProjectData: ProjectData = {
  key: PROJECT_DATA_KEY,
  projectName: "My BuildX Project",
  region: "UK",
};

class UserCache extends Dexie {
  houses: Dexie.Table<House, string>;
  projectData: Dexie.Table<ProjectData, string>;

  constructor() {
    super("UserDataCache");
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

const userCache = new UserCache();

userCache.projectData.get(PROJECT_DATA_KEY).then((x) => {
  if (typeof x === "undefined") {
    userCache.projectData.put(defaultProjectData);
  }
});

export const useProjectData = () => {
  const projectData = useLiveQuery(() =>
    userCache.projectData.get(PROJECT_DATA_KEY)
  );

  if (typeof projectData !== "undefined") {
    return projectData;
  }

  userCache.projectData.put(defaultProjectData);

  return defaultProjectData;
};

export const useProjectCurrency = () => {
  const { region } = useProjectData();
  const symbol = region === "UK" ? "£" : "€";
  const code = region === "UK" ? "GBP" : "EUR";

  // const format = (d: number) => {
  //   const formatted =
  //     Math.abs(d) > 1000
  //       ? `${Math.floor(d / 1000)}k`
  //       : d.toLocaleString("en-GB", {
  //           maximumFractionDigits: 1,
  //         });
  //   return formatted;
  // };

  // const formatWithUnit = (d: number, unitOfMeasurement: string) => {
  //   const formatted = format(d);
  //   const formattedWithUnit = ["€", "£", "$"].includes(unitOfMeasurement)
  //     ? `${unitOfMeasurement}${formatted}`
  //     : `${formatted}${unitOfMeasurement}`;
  //   return formattedWithUnit;
  // };

  return {
    symbol,
    code,
    formatWithSymbol: (x: number) => formatCurrency(x, symbol),
    formatWithCode: (x: number) => formatCurrency(x, code),
  };
};

export default userCache;
