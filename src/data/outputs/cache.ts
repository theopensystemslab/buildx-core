import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { LabourListRow, MaterialsListRow, OrderListRow } from "./metrics";

export type HouseModelsRow = {
  houseId: string;
  glbData: any;
  objData: any;
};

export type HousePngsRow = {
  houseId: string;
  pngBlob: Blob;
};

export const FILES_DOCUMENT_KEY = "FILES_DOCUMENT_KEY";

export type FilesDocument = {
  key: typeof FILES_DOCUMENT_KEY;
  allFilesZip?: File;
  orderListCsv?: File;
  materialsListCsv?: File;
  modelsZip?: File;
  labourListCsv?: File;
};

class OutputsCache extends Dexie {
  orderListRows: Dexie.Table<OrderListRow, string>;
  materialsListRows: Dexie.Table<MaterialsListRow, string>;
  labourListRows: Dexie.Table<LabourListRow, string>;
  houseModels: Dexie.Table<HouseModelsRow, string>;
  housePngs: Dexie.Table<HousePngsRow, string>;
  files: Dexie.Table<FilesDocument, typeof FILES_DOCUMENT_KEY>;

  constructor() {
    super("OutputsCache");

    this.version(1).stores({
      orderListRows: "[houseId+blockName]",
      materialsListRows: "[houseId+item]",
      labourListRows: "[houseId+buildingName]",
      houseModels: "houseId",
      housePngs: "houseId",
      files: "key",
    });

    this.orderListRows = this.table("orderListRows");
    this.materialsListRows = this.table("materialsListRows");
    this.houseModels = this.table("houseModels");
    this.housePngs = this.table("housePngs");
    this.files = this.table("files");
    this.labourListRows = this.table("labourListRows");
  }
}

const outputsCache = new OutputsCache();

outputsCache.files.toArray().then((files) => {
  if (files.length === 0) {
    outputsCache.files.put({ key: FILES_DOCUMENT_KEY });
  }
});

export const useOutputsFiles = () =>
  useLiveQuery(() => outputsCache.files.get(FILES_DOCUMENT_KEY), [], {
    key: FILES_DOCUMENT_KEY,
  }) as FilesDocument;

export const upsertHousePng = (houseId: string, pngBlob: Blob) => {
  outputsCache.housePngs.put({ houseId, pngBlob });
};

export default outputsCache;
