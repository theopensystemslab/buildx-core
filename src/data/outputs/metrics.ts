import { A, NEA, R } from "@/utils/functions";
import { Range } from "@/utils/types";
import { useLiveQuery } from "dexie-react-hooks";
import { pipe } from "fp-ts/lib/function";
import { useProjectCurrency } from "../user/utils";
import outputsCache from "./cache";

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
  embodiedCarbonGwp: number;
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

export type LabourListRow = {
  houseId: string;
  buildingName: string;
  labourType: string;
  hours: number;
  rate: {
    min: number;
    max: number;
  };
  cost: {
    min: number;
    max: number;
  };
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

export const getBlocksByHouse = (orderListRows: OrderListRow[]) =>
  pipe(
    orderListRows,
    NEA.groupBy((row) => row.houseId)
  ) as Record<string, OrderListRow[]>;

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

  const blocksByHouse = getBlocksByHouse(orderListRows);

  return {
    totalMaterialCost,
    totalManufacturingCost,
    totalTotalCost,
    orderListRows,
    blocksByHouse,
    blockCountsByHouse: pipe(
      blocksByHouse,
      R.map(A.reduce(0, (acc, v) => acc + v.count))
    ),
    fmt,
  };
};

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

export const useLabourListRows = (
  selectedHouseIds?: string[]
): LabourListRow[] => {
  return useLiveQuery(
    () =>
      selectedHouseIds
        ? outputsCache.labourListRows
            .where("houseId")
            .anyOf(selectedHouseIds)
            .toArray()
        : outputsCache.labourListRows.toArray(),
    [selectedHouseIds],
    []
  );
};

export const useTotalCosts = (selectedHouseIds?: string[]) => {
  const materialsListRows = useMaterialsListRows(selectedHouseIds);

  const labourListRows = useLabourListRows(selectedHouseIds);

  const materialsTotals = pipe(
    materialsListRows,
    A.reduce(
      {
        totalEstimatedCost: {
          min: 0,
          max: 0,
        },
        totalCarbonCost: {
          min: 0,
          max: 0,
        },
      },
      ({ totalEstimatedCost, totalCarbonCost }, row) => ({
        totalEstimatedCost: {
          min: totalEstimatedCost.min + row.cost.min,
          max: totalEstimatedCost.max + row.cost.max,
        },
        totalCarbonCost: {
          min: totalCarbonCost.min + row.embodiedCarbonCost.min,
          max: totalCarbonCost.max + row.embodiedCarbonCost.max,
        },
      })
    )
  );

  const labourTotal = pipe(
    labourListRows,
    A.reduce(0, (acc, row) => acc + row.cost.min)
  );

  return {
    materialsTotals,
    labourTotal,
  };
};
