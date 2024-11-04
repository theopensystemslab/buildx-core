import { CachedHouseType } from "@/data/build-systems/houseTypes";
import createHouseGroupTE from "@/tasks/createHouseGroupTE";
import { HouseGroup } from "@/three/objects/house/HouseGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { GUIConfig } from "./GUIManager";

export const houseTypeConfig: GUIConfig<CachedHouseType> = {
  items: [], // Will be populated with house types
  folderName: "House Type Selection",
  groupBySystem: (houseTypes) => {
    return houseTypes.reduce((acc, houseType) => {
      if (!acc[houseType.systemId]) {
        acc[houseType.systemId] = [];
      }
      acc[houseType.systemId].push(houseType);
      return acc;
    }, {} as Record<string, CachedHouseType[]>);
  },
  getSystemId: (houseType) => houseType.systemId,
  getDisplayName: (houseType) => houseType.name,
  clearScene: (scene) => {
    scene.remove(...scene.children.filter((x) => x instanceof HouseGroup));
  },
  loadItem: (scene, houseType) => {
    pipe(
      createHouseGroupTE({
        systemId: houseType.systemId,
        dnas: houseType.dnas,
        houseTypeId: houseType.id,
      }),
      TE.map((houseGroup) => {
        scene.add(houseGroup);
      })
    )();
  },
};
