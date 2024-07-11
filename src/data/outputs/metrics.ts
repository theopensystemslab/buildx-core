import { A } from "@/utils/functions";
import { useLiveQuery } from "dexie-react-hooks";
import outputsCache from "./cache";
import { useProjectCurrency } from "../user/cache";
import { pipe } from "fp-ts/lib/function";

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
};

export type MaterialsListRow = {
  houseId: string;
  item: string;
  buildingName: string;
  category: string;
  unit: string | null;
  quantity: number;
  specification: string;
  costPerUnit: number;
  cost: number;
  embodiedCarbonPerUnit: number;
  embodiedCarbonCost: number;
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

export const buildingColorVariants: Record<number, string> = {
  0: "bg-building-1",
  1: "bg-building-2",
  2: "bg-building-3",
  3: "bg-building-4",
  4: "bg-building-5",
  5: "bg-building-6",
  6: "bg-building-7",
  7: "bg-building-8",
  8: "bg-building-9",
  9: "bg-building-10",
  10: "bg-building-11",
  11: "bg-building-12",
  12: "bg-building-13",
  13: "bg-building-14",
  14: "bg-building-15",
  15: "bg-building-16",
  16: "bg-building-17",
  17: "bg-building-18",
  18: "bg-building-19",
  19: "bg-building-20",
};

export const staleColorVariants: Record<number, string> = {
  0: "bg-grey-50",
  1: "bg-grey-40",
  2: "bg-grey-30",
  3: "bg-grey-80",
  4: "bg-grey-70",
  5: "bg-grey-60",
};

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
