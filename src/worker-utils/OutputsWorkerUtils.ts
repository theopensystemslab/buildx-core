import {
  Block,
  BlockModulesEntry,
  BuildElement,
  BuildModule,
  CachedBlock,
  CachedBuildMaterial,
  CachedWindowType,
  ElementNotFoundError,
  LabourType,
  MaterialNotFoundError,
} from "@/data/build-systems";
import buildSystemsCache from "@/data/build-systems/cache";
import outputsCache, { FILES_DOCUMENT_KEY } from "@/data/outputs/cache";
import {
  LabourListRow,
  MaterialsListRow,
  OrderListRow,
  getBlocksByHouse,
} from "@/data/outputs/metrics";
import userCache from "@/data/user/cache";
import { House, housesToRecord } from "@/data/user/houses";
import { A, O, R, S } from "@/utils/functions";
import { csvFormatRows } from "d3-dsv";
import { liveQuery } from "dexie";
import { values } from "fp-ts-std/Record";
import { identity, pipe } from "fp-ts/lib/function";
import { produce } from "immer";
import JSZip from "jszip";
import { ExportersWorkerUtils, PngSnapshotsWorkerUtils } from ".";

const materialsProc = ({
  modules,
  elements,
  materials,
  windowTypes,
  houses,
  orderListRows,
}: {
  houses: House[];
  modules: BuildModule[];
  blocks: Block[];
  blockModulesEntries: BlockModulesEntry[];
  elements: BuildElement[];
  materials: CachedBuildMaterial[];
  windowTypes: CachedWindowType[];
  orderListRows: OrderListRow[];
}) => {
  outputsCache.materialsListRows.clear();

  const housesRecord = housesToRecord(houses);

  const orderListRowsTotal = orderListRows.reduce(
    (acc, v) => acc + v.totalCost,
    0
  );

  const getElementMaterial = (houseId: string, elementName: string) => {
    const house = housesRecord[houseId];

    const materialName =
      elementName in house.activeElementMaterials
        ? house.activeElementMaterials[elementName]
        : pipe(
            elements,
            A.findFirstMap((el) =>
              el.name === elementName ? O.some(el.defaultMaterial) : O.none
            ),
            O.fold(() => {
              throw new ElementNotFoundError(elementName, house.systemId);
            }, identity)
          );

    return pipe(
      materials,
      A.findFirst((x) => x.specification === materialName),
      O.fold(() => {
        throw new MaterialNotFoundError(elementName, house.systemId);
      }, identity)
    );
  };

  const getHouseModules = (houseId: string) =>
    pipe(
      houses,
      A.findFirst((x) => x.houseId === houseId),
      O.chain((house) =>
        pipe(
          house.dnas,
          A.traverse(O.Applicative)((dna) =>
            pipe(
              modules,
              A.findFirst((x) => x.systemId === house.systemId && x.dna === dna)
            )
          )
        )
      )
    );
  const getModuleWindowTypes = (module: BuildModule) =>
    pipe(
      module.structuredDna,
      R.reduceWithIndex(S.Ord)([], (key, acc: CachedWindowType[], value) => {
        switch (key) {
          case "windowTypeEnd":
          case "windowTypeSide1":
          case "windowTypeSide2":
          case "windowTypeTop":
            return pipe(
              windowTypes,
              A.findFirstMap((wt) =>
                wt.code === value ? O.some([...acc, wt]) : O.none
              ),
              O.getOrElse(() => acc)
            );
          default:
            return acc;
        }
      })
    );
  const getQuantityReducer = (
    item: string
  ): ((acc: number, module: BuildModule) => number) => {
    switch (item) {
      case "Screw piles":
        return (acc, module) => acc + module.screwpilesCount;

      case "Footings":
        return (acc, module) => acc + module.footingsCount;

      case "In-situ concrete":
        return (acc, module) => acc + module.concreteVolume;

      case "Ridge beam":
        return (acc, { lengthDims }) => acc + lengthDims;

      case "External breather membrane":
        return (acc, { membraneArea }) => acc + membraneArea;

      case "Internal vapour barrier":
        return (acc, { vclArea }) => acc + vclArea;

      case "Cladding":
      case "Battens":
        return (acc, { claddingArea }) => acc + claddingArea;

      case "Roofing":
        return (acc, { roofingArea }) => acc + roofingArea;

      case "Window trim":
        return (acc, module) => {
          const moduleWindowTypes = getModuleWindowTypes(module);
          return (
            acc +
            moduleWindowTypes.reduce((acc, v) => acc + v.openingPerimeter, 0)
          );
        };

      case "Windows":
        return (acc, module) => {
          const moduleWindowTypes = getModuleWindowTypes(module);
          return (
            acc + moduleWindowTypes.reduce((acc, v) => acc + v.glazingArea, 0)
          );
        };

      case "Doors":
        return (acc, module) => {
          const moduleWindowTypes = getModuleWindowTypes(module);
          return (
            acc + moduleWindowTypes.reduce((acc, v) => acc + v.doorArea, 0)
          );
        };

      case "Flashings":
        return (acc, module) => acc + module.flashingArea;

      case "Gutters and downpipes":
        return (acc, module) =>
          acc + module.gutterLength + module.downpipeLength;

      case "Flooring":
        return (acc, module) => acc + module.floorArea;

      case "Internal lining":
        return (acc, module) => acc + module.liningArea;

      case "Decking":
        return (acc, module) => acc + module.deckingArea;

      case "Sole plate":
        return (acc, module) => acc + module.soleplateLength;

      case "Rodent-protection mesh":
        return (acc, module) => acc + module.floorArea;

      case "Electrical and lighting":
        return (acc, module) => acc + module.electricalServices;

      case "Plumbing fixtures":
        return (acc, module) => acc + module.plumbingServices;

      case "Space heating":
        return (acc, module) => acc + module.heatingServices;

      case "Mechanical ventilation":
      default:
        return () => 0;
    }
  };

  const blocksByHouse = getBlocksByHouse(orderListRows);

  console.log("=== Debug blocksByHouse ===");
  console.log("orderListRows:", orderListRows);
  console.log("blocksByHouse result:", blocksByHouse);

  const houseMaterialCalculator = (house: House): MaterialsListRow[] => {
    const { houseId } = house;
    console.log(`\n=== Processing house ${houseId} ===`);
    console.log("Blocks for this house:", blocksByHouse[houseId]);

    const houseModules = getHouseModules(houseId);

    const elementRows: MaterialsListRow[] = pipe(
      elements,
      A.filterMap(({ category, name: item }) => {
        if (["Insulation"].includes(item)) return O.none;

        const reducer = getQuantityReducer(item);

        try {
          const material = getElementMaterial(houseId, item);

          const {
            specification,
            costPerUnit,
            embodiedCarbonPerUnit,
            linkUrl,
            unit,
          } = material;

          const quantity = pipe(
            houseModules,
            O.map(A.reduce(0, reducer)),
            O.getOrElse(() => 0)
          );

          const cost = {
            min: costPerUnit.min * quantity,
            max: costPerUnit.max * quantity,
          };

          const embodiedCarbonCost = {
            min: embodiedCarbonPerUnit.min * quantity,
            max: embodiedCarbonPerUnit.max * quantity,
          };

          return O.some<MaterialsListRow>({
            houseId,
            buildingName: house.friendlyName,
            item,
            category,
            unit,
            quantity,
            specification,
            costPerUnit,
            cost,
            embodiedCarbonPerUnit,
            embodiedCarbonCost,
            linkUrl,
          });
        } catch (e) {
          if (e instanceof MaterialNotFoundError) {
            // console.log(`MaterialNotFoundError: ${e.message}`)
            return O.none;
          } else if (e instanceof ElementNotFoundError) {
            console.error(`ElementNotFoundError: ${e.message}`);
            throw e;
          } else {
            throw e;
          }
        }
      })
    );

    const totalBlockCount = pipe(
      blocksByHouse[houseId],
      A.reduce(0, (acc, v) => {
        console.log("Adding to quantity:", v.count);
        return acc + v.count;
      })
    );

    const augmentedRows: MaterialsListRow[] = [
      {
        houseId,
        buildingName: house.friendlyName,
        item: "WikiHouse blocks",
        category: "Structure",
        unit: null,
        quantity: totalBlockCount,
        specification: "Insulated WikiHouse blocks",
        costPerUnit: { min: 0, max: 0 },
        cost: { min: orderListRowsTotal, max: orderListRowsTotal },
        embodiedCarbonPerUnit: { min: 0, max: 0 },
        embodiedCarbonCost: pipe(
          blocksByHouse[houseId],
          A.reduce({ min: 0, max: 0 }, (acc, v) => {
            return {
              min: acc.min + v.embodiedCarbonGwp,
              max: acc.max + v.embodiedCarbonGwp,
            };
          })
        ),
        linkUrl: "",
      },
    ];

    console.log(`total blocks for ${houseId}: ${totalBlockCount}`);

    return [...elementRows, ...augmentedRows].sort((a, b) =>
      a.category.localeCompare(b.category)
    );
  };

  const materialsListRows = houses.flatMap(houseMaterialCalculator);

  outputsCache.materialsListRows.bulkPut(materialsListRows);

  return materialsListRows;
};

const orderListProc = ({
  houses,
  modules,
  blocks,
  blockModulesEntries,
}: {
  houses: House[];
  modules: BuildModule[];
  blocks: CachedBlock[];
  blockModulesEntries: BlockModulesEntry[];
}) => {
  console.log("=== Debug orderListProc ===");
  console.log("Initial blockModulesEntries:", blockModulesEntries);

  outputsCache.orderListRows.clear();

  const accum: Record<string, number> = {};

  for (const blockModuleEntry of blockModulesEntries) {
    const { systemId, blockId, moduleIds } = blockModuleEntry;

    for (let moduleId of moduleIds) {
      const key = `${systemId}:${moduleId}:${blockId}`;

      if (key in accum) {
        accum[key] += 1;
      } else {
        accum[key] = 1;
      }
    }
  }

  const orderListRows = pipe(
    houses,
    A.chain(({ houseId: houseId, dnas: dnas, ...house }) =>
      pipe(
        dnas,
        A.map((dna) => ({
          ...pipe(
            modules,
            A.findFirstMap((module) =>
              module.systemId === house.systemId && module.dna === dna
                ? O.some({
                    module,
                    blocks: pipe(
                      accum,
                      R.filterMapWithIndex((key, count) => {
                        const [systemId, moduleId, blockId] = key.split(":");
                        return systemId === house.systemId &&
                          moduleId === module.id
                          ? O.some(
                              pipe(
                                blocks,
                                A.filterMap((block) =>
                                  block.systemId === house.systemId &&
                                  block.id === blockId
                                    ? O.some({
                                        blockId,
                                        count,
                                      })
                                    : O.none
                                )
                              )
                            )
                          : O.none;
                      }),
                      values,
                      A.flatten
                    ),
                  })
                : O.none
            ),
            O.toNullable
          ),
        })),
        A.reduce({}, (target: Record<string, number>, { blocks }) => {
          return produce(target, (draft) => {
            blocks?.forEach(({ blockId, count }) => {
              if (blockId in draft) {
                draft[blockId] += count;
              } else {
                draft[blockId] = count;
              }
            });
          });
        }),
        (x) => x,
        R.collect(S.Ord)((blockId, count) => {
          return {
            buildingName: house.friendlyName,
            houseId,
            block: blocks.find(
              (block) =>
                block.systemId === house.systemId && block.id === blockId
            ),
            count,
          };
        })
      )
    ),
    A.filterMap(
      ({ houseId, buildingName, block, count }): O.Option<OrderListRow> =>
        block
          ? O.some({
              houseId,
              blockName: block.name,
              buildingName,
              count,
              sheetsPerBlock: block.sheetQuantity,
              materialsCost: block.materialsCost * count,
              costPerBlock: block.totalCost,
              manufacturingCost: block.manufacturingCost * count,
              cuttingFileUrl: block.cuttingFileUrl,
              totalCost: block.totalCost * count,
              thumbnailBlob: block.imageBlob ?? null,
              embodiedCarbonGwp: block.embodiedCarbonGwp,
            })
          : O.none
    )
  );

  outputsCache.orderListRows.bulkPut(orderListRows);

  return orderListRows;
};

const orderListToCSV = (orderListRows: OrderListRow[]) => {
  // Create a header row
  const headers =
    orderListRows.length > 0
      ? (Object.keys(orderListRows[0]).filter(
          (x) => !["houseId"].includes(x)
        ) as Array<keyof OrderListRow>)
      : [];

  // Map each object to an array of its values
  const rows = orderListRows.map((row) =>
    headers.map((header) => row[header]?.toString() ?? "")
  );

  // Combine header and rows
  const csvData = [headers, ...rows];

  // Format the 2D array into a CSV string
  const csvContent = csvFormatRows(csvData);

  return new File([new Blob([csvContent])], "order-list.csv", {
    type: "text/csv;charset=utf-8;",
  });
};

const materialsListToCSV = (materialsListRows: MaterialsListRow[]) => {
  // Create a header row
  const headers =
    materialsListRows.length > 0
      ? (Object.keys(materialsListRows[0]).filter(
          (x) => !["houseId", "colorClass", "linkUrl"].includes(x)
        ) as Array<keyof (typeof materialsListRows)[0]>)
      : [];

  // Map each object to an array of its values
  const rows = materialsListRows.map((row) =>
    headers.map((header) => row[header]?.toString() ?? "")
  );

  // Combine header and rows
  const csvData = [headers, ...rows];

  // Format the 2D array into a CSV string
  const csvContent = csvFormatRows(csvData);

  return new File([new Blob([csvContent])], "materials-list.csv", {
    type: "text/csv;charset=utf-8;",
  });
};

const labourListToCSV = (labourListRows: LabourListRow[]) => {
  const flattenedHeaders = [
    "houseId",
    "buildingName",
    "labourType",
    "hours",
    "rateMin",
    "rateMax",
    "costMin",
    "costMax",
  ];

  const rows = labourListRows.map((row) => [
    row.houseId,
    row.buildingName,
    row.labourType,
    row.hours.toString(),
    row.rate.min.toString(),
    row.rate.max.toString(),
    row.cost.min.toString(),
    row.cost.max.toString(),
  ]);

  const csvData = [flattenedHeaders, ...rows];
  const csvContent = csvFormatRows(csvData);
  return new File([new Blob([csvContent])], "labour-list.csv", {
    type: "text/csv;charset=utf-8;",
  });
};

const updateAllFiles = async () => {
  const [currentFiles, currentPngs, currentModels] = await Promise.all([
    outputsCache.files.get(FILES_DOCUMENT_KEY),
    outputsCache.housePngs.toArray(),
    outputsCache.houseModels.toArray(),
  ]);

  if (currentFiles && currentPngs && currentModels) {
    const allFiles = new JSZip();
    const { orderListCsv, materialsListCsv } = currentFiles;
    if (orderListCsv) {
      allFiles.file(orderListCsv.name, orderListCsv);
    }
    if (materialsListCsv) {
      allFiles.file(materialsListCsv.name, materialsListCsv);
    }
    currentPngs.forEach(({ houseId, pngBlob }) => {
      allFiles.file(`${houseId}.png`, pngBlob);
    });
    currentModels.forEach(({ houseId, glbData, objData }) => {
      allFiles.file(`${houseId}.obj`, objData);
      allFiles.file(`${houseId}.glb`, glbData);
    });

    const allFilesZip = await allFiles
      .generateAsync({
        type: "blob",
      })
      .then((blob) => new File([blob], "all-files.zip"));

    outputsCache.files.update(FILES_DOCUMENT_KEY, {
      allFilesZip,
    });
  }
};

const labourProc = ({
  houses,
  modules,
  labourTypes,
}: {
  houses: House[];
  modules: BuildModule[];
  labourTypes: LabourType[];
}) => {
  outputsCache.labourListRows.clear();

  const getLabourCost = (hours: number, type: string) => {
    const labourType = labourTypes.find(
      (lt) => lt.name === type + " install" || lt.name === type + " labour"
    );
    if (!labourType)
      return {
        rate: { min: 0, max: 0 },
        cost: { min: 0, max: 0 },
      };

    return {
      rate: {
        min: labourType.minLabourCost,
        max: labourType.maxLabourCost,
      },
      cost: {
        min: hours * labourType.minLabourCost,
        max: hours * labourType.maxLabourCost,
      },
    };
  };

  const labourListRows = houses.flatMap(
    ({ houseId, dnas, friendlyName: buildingName }) => {
      const houseModules = pipe(
        dnas,
        A.traverse(O.Applicative)((dna) =>
          pipe(
            modules,
            A.findFirst((x) => x.dna === dna)
          )
        ),
        O.getOrElse(() => [] as BuildModule[])
      );

      // Calculate hours for each type
      const foundationHours = houseModules.reduce(
        (acc, m) => acc + m.foundationLabourHours,
        0
      );
      const chassisHours = houseModules.reduce(
        (acc, m) => acc + m.chassisLabourHours,
        0
      );
      const exteriorHours = houseModules.reduce(
        (acc, m) => acc + m.exteriorLabourHours,
        0
      );
      const interiorHours = houseModules.reduce(
        (acc, m) => acc + m.interiorLabourHours,
        0
      );

      // Create a row for each labour type
      return [
        {
          houseId,
          buildingName,
          labourType: "Foundation",
          hours: foundationHours,
          ...getLabourCost(foundationHours, "Foundation"),
        },
        {
          houseId,
          buildingName,
          labourType: "Chassis",
          hours: chassisHours,
          ...getLabourCost(chassisHours, "Chassis"),
        },
        {
          houseId,
          buildingName,
          labourType: "Exterior",
          hours: exteriorHours,
          ...getLabourCost(exteriorHours, "Exterior"),
        },
        {
          houseId,
          buildingName,
          labourType: "Interior",
          hours: interiorHours,
          ...getLabourCost(interiorHours, "Interior"),
        },
      ];
    }
  );

  outputsCache.labourListRows.bulkPut(labourListRows);

  return labourListRows;
};
// const [
//   houses,
//   modules,
//   blocks,
//   blockModulesEntries,
//   elements,
//   materials,
//   windowTypes,
//   labourTypes,
// ] = await
const housesAndSystemsQuerier = () =>
  Promise.all([
    userCache.houses.toArray(),
    buildSystemsCache.modules.toArray(),
    buildSystemsCache.blocks.toArray(),
    buildSystemsCache.blockModuleEntries.toArray(),
    buildSystemsCache.elements.toArray(),
    buildSystemsCache.materials.toArray(),
    buildSystemsCache.windowTypes.toArray(),
    buildSystemsCache.labourTypes.toArray(),
  ]);

const housesAndSystemsSubscriber = async ([
  houses,
  modules,
  blocks,
  blockModulesEntries,
  elements,
  materials,
  windowTypes,
  labourTypes,
]: Awaited<ReturnType<typeof housesAndSystemsQuerier>>) => {
  const orderListRows = orderListProc({
    houses,
    modules,
    blocks,
    blockModulesEntries: blockModulesEntries || [],
  });

  const materialsListRows = materialsProc({
    houses,
    modules,
    elements: elements || [],
    materials: materials || [],
    windowTypes: windowTypes || [],
    orderListRows,
    blockModulesEntries: blockModulesEntries || [],
    blocks,
  });

  const labourListRows = labourProc({
    houses,
    modules,
    labourTypes: labourTypes || [],
  });

  const orderListCsv = orderListToCSV(orderListRows);
  const materialsListCsv = materialsListToCSV(materialsListRows);
  const labourListCsv = labourListToCSV(labourListRows);

  await ExportersWorkerUtils.deleteRedundantModels();
  await PngSnapshotsWorkerUtils.deleteRedundantSnapshots();

  await outputsCache.files
    .update(FILES_DOCUMENT_KEY, {
      materialsListCsv,
      orderListCsv,
      labourListCsv,
    })
    .then(() => {
      updateAllFiles();
    });
};

// if update houses then update order list
// then update materials list
// then update csv's
// then update the all files zip
export const housesAndSystemsWatcher = () =>
  liveQuery(housesAndSystemsQuerier).subscribe(housesAndSystemsSubscriber);

const houseModelsQuerier = () => outputsCache.houseModels.toArray();

const houseModelsSubscriber = async (
  houseModels: Awaited<ReturnType<typeof houseModelsQuerier>>
) => {
  const zipper = new JSZip();

  houseModels.forEach(({ houseId, glbData, objData }) => {
    zipper.file(`${houseId}.obj`, objData);
    zipper.file(`${houseId}.glb`, glbData);
  });

  const modelsZip = await zipper
    .generateAsync({
      type: "blob",
    })
    .then((blob) => new File([blob], "models.zip"));

  await outputsCache.files.update(FILES_DOCUMENT_KEY, {
    modelsZip,
  });

  updateAllFiles();
};

// if update models then update all models zip
// then update the all files zip
const houseModelsWatcher = () =>
  liveQuery(houseModelsQuerier).subscribe(houseModelsSubscriber);

const OutputsWorkerUtils = {
  housesAndSystemsWatcher,
  houseModelsWatcher,
};

export default OutputsWorkerUtils;
