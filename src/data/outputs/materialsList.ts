import { useLiveQuery } from "dexie-react-hooks";
import { MaterialsListRow } from "./metrics";
import outputsCache from "./cache";

export const useMaterialsListRows = (
  selectedHouseIds?: string[]
): MaterialsListRow[] => {
  return useLiveQuery(
    () =>
      selectedHouseIds
        ? outputsCache.materialsListRows
            .where("houseId")
            .anyOf(selectedHouseIds)
            .toArray()
        : outputsCache.materialsListRows.toArray(),
    [selectedHouseIds],
    []
  );
};
