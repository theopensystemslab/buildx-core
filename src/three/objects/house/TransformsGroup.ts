import { Group } from "three";
import { UserDataTypeEnum } from "../types";

type TransformsGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.TransformsGroup;
  systemId: string;
  houseId: string;
  houseTypeId: string;
  friendlyName: string;
  // // materials
  // materials: Record<string, EnrichedMaterial> // specification : EnrichedMaterial
  // elements: Record<string, Element> // ifcTag : Element ... for material opts/defaults
  // activeElementMaterials: Record<string, string> // ifcTag : specification
};

export class TransformsGroup extends Group {
  userData: TransformsGroupUserData;

  constructor(userData: TransformsGroupUserData) {
    super();
    this.userData = userData;
  }

  // resetMaterials: () => void
  // pushElement: (element: Element) => ThreeMaterial
  // changeMaterial: (ifcTag: string, specification: string) => void
  // // clipping planes
  // clippingPlanes: Plane[]
  // setVerticalCuts: () => void
  // setLevelCut: (levelIndex: number | null) => void
  // // layouts
  // layouts: Layouts
  // getActiveLayout: () => ActiveLayout
  // getActiveLayoutGroup: () => HouseLayoutGroup
  // setActiveLayout: (altLayout: AltLayout) => void
  // getVisibleLayout: () => Layout
  // setPreviewLayout: (maybeAltLayout: AltLayout | null) => void
  // pushAltLayout: (altLayout: AltLayout) => void
  // dropAltLayoutsByType: (type: LayoutType) => void
  // refreshAltSectionTypeLayouts: () => void
  // // refreshAltLevelTypeLayouts: (scopeElement: ScopeElement) => void
  // // refreshAltWindowTypeLayouts: (scopeElement: ScopeElement) => void
  // refreshAltResetLayout: () => Promise<void>
  // // refreshAltWindowTypeLayouts: () => void
  // // handle init
  // initRotateAndStretchXHandles: () => void
  // // handle visibility
  // setXStretchHandlesVisible: (bool?: boolean) => void
  // setZStretchHandlesVisible: (bool?: boolean) => void
  // setRotateHandlesVisible: (bool?: boolean) => void
  // switchHandlesVisibility: (value?: HandleTypeEnum | null) => void
  // // handle dimension sync
  // // updateXStretchHandleLengths: () => void
  // updateHandles: () => void
  // // collisions
  // computeNearNeighbours: (worldGroup?: Group) => HouseTransformsGroup[]
  // computeLengthWiseNeighbours: () => HouseTransformsGroup[]
  // checkCollisions: (nearNeighbours: HouseTransformsGroup[]) => boolean
  // updateTransforms: () => void
  // // exports
  // updateExportModels: () => void
  // // database
  // updateDB: () => Promise<void>
  // addToDB: () => Promise<void>
  // deleteHouse: () => void
}

export const createTransformsGroup = () => {};
