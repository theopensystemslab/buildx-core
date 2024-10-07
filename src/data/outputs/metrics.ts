import { A } from "@/utils/functions";
import { useLiveQuery } from "dexie-react-hooks";
import outputsCache from "./cache";
import { pipe } from "fp-ts/lib/function";
import { useProjectCurrency } from "../user/utils";
import { Range } from "@/utils/types";

export type OrderListRow = {
  houseId: string;
  blockName: string;
  buildingName: string;
  sheetsPerBlock: number;
  count: number;
  materialsCost: number; // connect  to element Structure's material cost
  manufacturingCost: number;
  costPerBlock: number;
  cuttingFileUrl: string;
  totalCost: number;
  thumbnailBlob: Blob | null;
};

export type MaterialsListRow = {
  houseId: string;
  item: string;
  buildingName: string;
  category: string;
  unit: string | null;
  quantity: number;
  specification: string;
  costPerUnit: Range;
  cost: Range;
  embodiedCarbonPerUnit: Range;
  embodiedCarbonCost: Range;
  linkUrl?: string;
};

export const useAllOrderListRows = (): OrderListRow[] =>
  useLiveQuery(() => outputsCache.orderListRows.toArray(), [], []);

export const useAllMaterialsListRows = (): MaterialsListRow[] =>
  useLiveQuery(() => outputsCache.materialsListRows.toArray(), [], []);

// export const useSelectedHouseOrderListRows = (): OrderListRow[] => {
//   const selectedHouseIds = useSelectedHouseIds()

//   return useLiveQuery(
//     () =>
//       outputsCache.orderListRows
//         .where("houseId")
//         .anyOf(selectedHouseIds)
//         .toArray(),
//     [selectedHouseIds],
//     []
//   )
// }

// export const useSelectedHouseMaterialsListRows = (): MaterialsListRow[] => {
//   const selectedHouseIds = useSelectedHouseIds()

//   return useLiveQuery(
//     () =>
//       outputsCache.materialsListRows
//         .where("houseId")
//         .anyOf(selectedHouseIds)
//         .toArray(),
//     [selectedHouseIds],
//     []
//   )
// }

// export const useMetricsOrderListRows = (): OrderListRow[] => {
//   const buildingHouseId = useBuildingHouseId()

//   return useLiveQuery(
//     () => {
//       if (buildingHouseId) {
//         return outputsCache.orderListRows
//           .where("houseId")
//           .equals(buildingHouseId)
//           .toArray()
//       } else {
//         return outputsCache.orderListRows.toArray()
//       }
//     },
//     [buildingHouseId],
//     []
//   )
// }

// export const useGetColorClass = () => {
//   const selectedHouseIds = useSelectedHouseIds()

//   return (houseId: string, opts: { stale?: boolean } = {}) => {
//     const { stale = false } = opts
//     const index = selectedHouseIds.indexOf(houseId)
//     return stale ? staleColorVariants[index] : buildingColorVariants[index]
//   }
// }

export const getBlockCountsByHouse = A.reduce(
  {},
  (acc: Record<string, number>, row: OrderListRow) => {
    if (row.houseId in acc) {
      acc[row.houseId] += row.count;
    } else {
      acc[row.houseId] = row.count;
    }
    return acc;
  }
);

// export const useOrderListData = () => {
//   const orderListRows = useSelectedHouseOrderListRows()

//   const { code: currencyCode } = useProjectCurrency()

//   const fmt = (value: number) =>
//     new Intl.NumberFormat("en-US", {
//       style: "currency",
//       currency: currencyCode,
//       maximumFractionDigits: 0,
//     }).format(value)

//   const { totalMaterialCost, totalManufacturingCost, totalTotalCost } = pipe(
//     orderListRows,
//     A.reduce(
//       { totalMaterialCost: 0, totalManufacturingCost: 0, totalTotalCost: 0 },
//       ({ totalMaterialCost, totalManufacturingCost, totalTotalCost }, row) => ({
//         totalMaterialCost: totalMaterialCost + row.materialsCost,
//         totalManufacturingCost: totalManufacturingCost + row.manufacturingCost,
//         totalTotalCost: totalTotalCost + row.totalCost,
//       })
//     )
//     // R.map(fmt)
//   )

//   return {
//     totalMaterialCost,
//     totalManufacturingCost,
//     totalTotalCost,
//     orderListRows,
//     blockCountsByHouse: getBlockCountsByHouse(orderListRows),
//     fmt,
//   }
// }

export const useOrderListData = (selectedHouseIds?: string[]) => {
  const orderListRows = useLiveQuery(
    async () => {
      const orderListRows = await outputsCache.orderListRows.toArray();
      if (!selectedHouseIds) return orderListRows;
      return orderListRows.filter((x) => selectedHouseIds.includes(x.houseId));
    },
    [selectedHouseIds],
    [] as OrderListRow[]
  );

  const { code: currencyCode } = useProjectCurrency();

  const fmt = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);

  const { totalMaterialCost, totalManufacturingCost, totalTotalCost } = pipe(
    orderListRows,
    A.reduce(
      { totalMaterialCost: 0, totalManufacturingCost: 0, totalTotalCost: 0 },
      ({ totalMaterialCost, totalManufacturingCost, totalTotalCost }, row) => ({
        totalMaterialCost: totalMaterialCost + row.materialsCost,
        totalManufacturingCost: totalManufacturingCost + row.manufacturingCost,
        totalTotalCost: totalTotalCost + row.totalCost,
      })
    )
    // R.map(fmt)
  );

  return {
    totalMaterialCost,
    totalManufacturingCost,
    totalTotalCost,
    orderListRows,
    blockCountsByHouse: getBlockCountsByHouse(orderListRows),
    fmt,
  };
};
