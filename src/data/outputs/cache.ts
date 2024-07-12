import Dexie from "dexie";
import { MaterialsListRow, OrderListRow } from "./metrics";
import { OutputsWorker } from "@/three/workers";

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
};
class OutputsCache extends Dexie {
  orderListRows: Dexie.Table<OrderListRow, string>;
  materialsListRows: Dexie.Table<MaterialsListRow, string>;
  houseModels: Dexie.Table<HouseModelsRow, string>;
  housePngs: Dexie.Table<HousePngsRow, string>;
  files: Dexie.Table<FilesDocument, typeof FILES_DOCUMENT_KEY>;

  constructor() {
    super("OutputsCache");

    this.version(1).stores({
      orderListRows: "[houseId+blockName]",
      materialsListRows: "[houseId+item]",
      houseModels: "houseId",
      housePngs: "houseId",
      files: "key",
    });

    this.orderListRows = this.table("orderListRows");
    this.materialsListRows = this.table("materialsListRows");
    this.houseModels = this.table("houseModels");
    this.housePngs = this.table("housePngs");
    this.files = this.table("files");
  }
}

const outputsCache = new OutputsCache();

outputsCache.files.toArray().then((files) => {
  if (files.length === 0) {
    outputsCache.files.put({ key: FILES_DOCUMENT_KEY });
  }
});

const ENABLE_OUTPUTS = true;

if (ENABLE_OUTPUTS) {
  new OutputsWorker();
}

export default outputsCache;
