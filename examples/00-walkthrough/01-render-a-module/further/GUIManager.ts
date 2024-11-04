import { systems } from "@/data/build-systems/systems";
import * as dat from "dat.gui";
import { Scene } from "three";

export interface GUIConfig<T> {
  // The items to manage in the GUI
  items: T[];
  // Function to group items by system
  groupBySystem: (items: T[]) => Record<string, T[]>;
  // Function to get the system ID from an item
  getSystemId: (item: T) => string;
  // Function to get the display name for the dropdown
  getDisplayName: (item: T) => string;
  // Function to clear existing items from the scene
  clearScene: (scene: Scene) => void;
  // Function to load a new item into the scene
  loadItem: (scene: Scene, item: T) => Promise<void> | void;
  // Optional folder name
  folderName?: string;
}

class GUIManager<T> {
  private gui: dat.GUI;
  private scene: Scene;
  private config: GUIConfig<T>;
  private modulesBySystem: Record<string, T[]>;
  private systemNameToId: Record<string, string>;

  constructor(scene: Scene, config: GUIConfig<T>) {
    this.scene = scene;
    this.config = config;
    this.gui = new dat.GUI();
    this.modulesBySystem = this.config.groupBySystem(config.items);
    this.systemNameToId = this.createSystemNameMapping();
    this.initialize();
  }

  private createSystemNameMapping(): Record<string, string> {
    return systems.reduce((acc, system) => {
      acc[system.name] = system.id;
      return acc;
    }, {} as Record<string, string>);
  }

  private initialize(): void {
    const folderName = this.config.folderName || "Selection";
    const systemFolder = this.gui.addFolder(folderName);

    const firstItem = this.config.items[0];
    const firstSystemId = this.config.getSystemId(firstItem);
    const firstSystem = systems.find((s) => s.id === firstSystemId);
    const systemNames = systems.map((s) => s.name);

    const params = {
      selectedSystem: firstSystem?.name ?? "",
      selectedItem: this.config.getDisplayName(firstItem),
    };
    this.setupSystemDropdown(systemFolder, params, systemNames);
    this.updateItemControl(
      systemFolder,
      params,
      this.modulesBySystem[firstSystemId] || []
    );
    systemFolder.open();

    // Load initial item
    this.config.loadItem(this.scene, firstItem);
  }

  private setupSystemDropdown(
    folder: dat.GUI,
    params: { selectedSystem: string; selectedItem: string },
    systemNames: string[]
  ): void {
    folder
      .add(params, "selectedSystem", systemNames)
      .onChange((systemName: string) => {
        const systemId = this.systemNameToId[systemName];
        const systemItems = this.modulesBySystem[systemId] || [];
        this.updateItemControl(folder, params, systemItems);
      });
  }

  private updateItemControl(
    folder: dat.GUI,
    params: { selectedSystem: string; selectedItem: string },
    items: T[]
  ): void {
    const oldControl = folder.__controllers.find(
      (c: { property: string }) => c.property === "selectedItem"
    );
    if (oldControl) {
      folder.remove(oldControl);
    }

    const newControl = folder
      .add(
        params,
        "selectedItem",
        items.map((item) => this.config.getDisplayName(item))
      )
      .onChange((displayName: string) =>
        this.handleItemChange(params, displayName)
      );

    const firstItem = items[0];
    if (firstItem) {
      params.selectedItem = this.config.getDisplayName(firstItem);
      newControl.setValue(params.selectedItem);
    }
  }

  private handleItemChange(
    params: { selectedSystem: string; selectedItem: string },
    displayName: string
  ): void {
    const currentSystemId = this.systemNameToId[params.selectedSystem];
    const selectedItem = this.config.items.find(
      (item) =>
        this.config.getDisplayName(item) === displayName &&
        this.config.getSystemId(item) === currentSystemId
    );

    if (selectedItem) {
      this.config.clearScene(this.scene);
      this.config.loadItem(this.scene, selectedItem);
    }
  }

  public dispose(): void {
    this.gui.destroy();
  }
}
export default GUIManager;
