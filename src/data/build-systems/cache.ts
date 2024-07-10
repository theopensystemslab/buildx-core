import Dexie from "dexie";
import { BlockModulesEntry } from "./blockModulesEntries";
import { Block } from "./blocks";
import { BuildElement } from "./elements";
import { EnergyInfo } from "./energyInfos";
import { CachedHouseType } from "./houseTypes";
import { LevelType } from "./levelTypes";
import { CachedBuildMaterial } from "./materials";
import { CachedBuildModel } from "./models";
import { BuildModule } from "./modules";
import { SectionType } from "./sectionTypes";
import { SystemSettings } from "./settings";
import { SpaceType } from "./spaceTypes";
import { StairType } from "./stairTypes";
import { CachedWindowType } from "./windowTypes";

export type BlobbedImage<T> = Omit<T, "imageUrl"> & {
  imageBlob?: Blob;
};

class BuildSystemsCache extends Dexie {
  modules: Dexie.Table<BuildModule, string>;
  houseTypes: Dexie.Table<CachedHouseType, string>;
  elements: Dexie.Table<BuildElement, string>;
  materials: Dexie.Table<CachedBuildMaterial, string>;
  models: Dexie.Table<CachedBuildModel, string>;
  sectionTypes: Dexie.Table<SectionType, string>;
  levelTypes: Dexie.Table<LevelType, string>;
  windowTypes: Dexie.Table<CachedWindowType, string>;
  blocks: Dexie.Table<Block, string>;
  blockModuleEntries: Dexie.Table<BlockModulesEntry, string>;
  spaceTypes: Dexie.Table<SpaceType, string>;
  stairTypes: Dexie.Table<StairType, string>;
  energyInfos: Dexie.Table<EnergyInfo, string>;
  settings: Dexie.Table<SystemSettings, string>;

  constructor() {
    super("BuildSystemsCache");

    this.version(3).stores({
      modules: "[systemId+dna]",
      houseTypes: "id",
      elements: "[systemId+ifcTag]",
      materials: "[systemId+specification]",
      models: "speckleBranchUrl",
      sectionTypes: "[systemId+code]",
      levelTypes: "[systemId+code]",
      windowTypes: "[systemId+code]",
      blocks: "[systemId+name]",
      blockModuleEntries: "id",
      spaceTypes: "id",
      stairTypes: "id",
      energyInfos: "id",
      settings: "systemId",
    });
    this.modules = this.table("modules");
    this.houseTypes = this.table("houseTypes");
    this.elements = this.table("elements");
    this.materials = this.table("materials");
    this.models = this.table("models");
    this.sectionTypes = this.table("sectionTypes");
    this.levelTypes = this.table("levelTypes");
    this.windowTypes = this.table("windowTypes");
    this.blocks = this.table("blocks");
    this.blockModuleEntries = this.table("blockModuleEntries");
    this.spaceTypes = this.table("spaceTypes");
    this.stairTypes = this.table("stairTypes");
    this.energyInfos = this.table("energyInfos");
    this.settings = this.table("settings");
  }
}

const buildSystemsCache = new BuildSystemsCache();

export default buildSystemsCache;
