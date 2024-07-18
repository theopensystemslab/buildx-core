import {
  BuildModule,
  Block,
  BlockModulesEntry,
  BuildElement,
  CachedBuildMaterial,
  CachedWindowType,
  ElementNotFoundError,
  MaterialNotFoundError,
} from "@/data/build-systems";
import buildSystemsCache from "@/data/build-systems/cache";
import outputsCache, { FILES_DOCUMENT_KEY } from "@/data/outputs/cache";
import {
  MaterialsListRow,
  OrderListRow,
  getBlockCountsByHouse,
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
      case "Pile footings":
        return (acc, module) => acc + module.footingsCount;

      case "In-situ concrete":
        return (acc, module) => acc + module.concreteVolume;

      case "Ridge beam":
        return (acc, { lengthDims }) => acc + lengthDims;

      case "External breather membrane":
        return (acc, { claddingArea, roofingArea, floorArea }) =>
          acc + claddingArea + roofingArea + floorArea;

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

      case "Space heating":
      case "Mechanical ventilation":
      case "Electrical and lighting":
      default:
        return () => 0;
    }
  };

  const blockCountsByHouse = getBlockCountsByHouse(orderListRows);

  const houseMaterialCalculator = (house: House): MaterialsListRow[] => {
    const { houseId } = house;
    const houseModules = getHouseModules(houseId);

    const elementRows: MaterialsListRow[] = pipe(
      elements,
      A.filterMap(({ category, name: item }) => {
        if (["Insulation"].includes(item)) return O.none;

        // if (!categories.includes(category)) categories.push(category)

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

          const cost = costPerUnit * quantity;

          const embodiedCarbonCost = embodiedCarbonPerUnit * quantity;

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

    const augmentedRows: MaterialsListRow[] = [
      {
        houseId,
        buildingName: house.friendlyName,
        item: "WikiHouse blocks",
        category: "Structure",
        unit: null,
        quantity: blockCountsByHouse[houseId],
        specification: "Insulated WikiHouse blocks",
        costPerUnit: 0,
        cost: orderListRowsTotal,
        embodiedCarbonPerUnit: 0,
        embodiedCarbonCost: 0,
        linkUrl: "",
      },
    ];

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
  blocks: Block[];
  blockModulesEntries: BlockModulesEntry[];
}) => {
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
            })
          : O.none
    )
  );

  outputsCache.orderListRows.bulkPut(orderListRows);

  return orderListRows;
};

const orderListToCSV = (orderListRows: OrderListRow[]) => {
  // Create a header row
  const headers = Object.keys(orderListRows[0]).filter(
    (x) => !["houseId"].includes(x)
  ) as Array<keyof OrderListRow>;

  // Map each object to an array of its values
  const rows = orderListRows.map((row) =>
    headers.map((header) => row[header].toString())
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
  const headers = Object.keys(materialsListRows[0]).filter(
    (x) => !["houseId", "colorClass", "linkUrl"].includes(x)
  ) as Array<keyof (typeof materialsListRows)[0]>;

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

// if update houses then update order list
// then update materials list
// then update csv's
// then update the all files zip
liveQuery(() =>
  Promise.all([
    userCache.houses.toArray(),
    buildSystemsCache.modules.toArray(),
    buildSystemsCache.blocks.toArray(),
    buildSystemsCache.blockModuleEntries.toArray(),
    buildSystemsCache.elements.toArray(),
    buildSystemsCache.materials.toArray(),
    buildSystemsCache.windowTypes.toArray(),
  ])
).subscribe(
  async ([
    houses,
    modules,
    blocks,
    blockModulesEntries,
    elements,
    materials,
    windowTypes,
  ]) => {
    const orderListRows = orderListProc({
      houses,
      modules,
      blocks,
      blockModulesEntries,
    });

    if (orderListRows.length === 0) return;

    const materialsListRows = materialsProc({
      houses,
      modules,
      blocks,
      blockModulesEntries,
      orderListRows,
      elements,
      materials,
      windowTypes,
    });

    const orderListCsv = orderListToCSV(orderListRows);
    const materialsListCsv = materialsListToCSV(materialsListRows);

    outputsCache.files
      .update(FILES_DOCUMENT_KEY, {
        materialsListCsv,
        orderListCsv,
      })
      .then(() => {
        updateAllFiles();
      });
  }
);

// if update models then update all models zip
// then update the all files zip
liveQuery(() => outputsCache.houseModels.toArray()).subscribe(
  async (houseModels) => {
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
  }
);
