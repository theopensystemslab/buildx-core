import * as dat from "dat.gui";
import { Scene } from "three";

export interface GUIConfig<T> {
  items: T[];
  folderName: string;
  groupBySystem: (items: T[]) => Record<string, T[]>;
  getSystemId: (item: T) => string;
  getDisplayName: (item: T) => string;
  clearScene: (scene: Scene) => void;
  loadItem: (scene: Scene, item: T) => void;
}

export class GUIManager<T> {
  private gui: dat.GUI;
  private scene: Scene;
  private config: GUIConfig<T>;

  constructor(scene: Scene, config: GUIConfig<T>) {
    this.scene = scene;
    this.config = config;
    this.gui = new dat.GUI();
    this.initialize();
  }

  private initialize() {
    const folder = this.gui.addFolder(this.config.folderName);
    const itemsBySystem = this.config.groupBySystem(this.config.items);

    const params = {
      selectedSystem: Object.keys(itemsBySystem)[0] || "",
      selectedItem: "",
    };

    // Add system selection dropdown
    folder
      .add(params, "selectedSystem", Object.keys(itemsBySystem))
      .onChange((systemId: string) => {
        this.config.clearScene(this.scene);
        this.updateItemDropdown(folder, params, systemId, itemsBySystem);
      });

    // Initialize with first system's items
    this.updateItemDropdown(
      folder,
      params,
      params.selectedSystem,
      itemsBySystem
    );
    folder.open();
  }

  private updateItemDropdown(
    folder: dat.GUI,
    params: any,
    systemId: string,
    itemsBySystem: Record<string, T[]>
  ) {
    const systemItems = itemsBySystem[systemId] || [];

    // Remove existing item dropdown if it exists
    const oldControl = folder.__controllers.find(
      (c: { property: string }) => c.property === "selectedItem"
    );
    if (oldControl) {
      folder.remove(oldControl);
    }

    // Set initial value before creating the control
    if (systemItems.length > 0) {
      params.selectedItem = this.config.getDisplayName(systemItems[0]);
    }

    // Add new item dropdown
    const controller = folder
      .add(
        params,
        "selectedItem",
        systemItems.map((item) => this.config.getDisplayName(item))
      )
      .onChange((itemName: string) => {
        const selectedItem = systemItems.find(
          (item) => this.config.getDisplayName(item) === itemName
        );

        if (selectedItem) {
          this.config.clearScene(this.scene);
          this.config.loadItem(this.scene, selectedItem);
        }
      });

    // Force the controller to update its display
    if (systemItems.length > 0) {
      controller.updateDisplay();
      this.config.loadItem(this.scene, systemItems[0]);
    }
  }

  public dispose() {
    this.gui.destroy();
  }
}
