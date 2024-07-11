import { cachedHouseTypesTE } from "./data/build-systems/cache";
import { cameraFrameOBB } from "./three/utils/camera";
import createBasicScene from "./three/utils/createBasicScene";
import { OutputsWorker, PngSnapshotsWorker } from "./three/workers";

import type { CachedHouseType } from "./data/build-systems/cache";
import BuildXScene from "./three/objects/scene/BuildXScene";
import houseGroupTE from "./tasks/houseGroupTE";
import { HouseGroup } from "./three/objects/house/HouseGroup";
import type { ScopeElement } from "./three/objects/types";
import type { OpeningsChangeInfo } from "./three/managers/OpeningsManager";
import { SceneContextModeLabel } from "./three/managers/ContextManager";
import type { SceneContextMode } from "./three/managers/ContextManager";
import { useProjectCurrency, useProjectData } from "./data/user/cache";
import { useOrderListData } from "./data/outputs/metrics";
import { useAnalyseData } from "./data/outputs/analysisData";
import { useHouses } from "./data/user/houses";

export {
  defaultCachedHousesOps,
  localHousesTE as cachedHousesTE,
} from "./data/user/houses";

export {
  createBasicScene,
  cameraFrameOBB,
  OutputsWorker,
  PngSnapshotsWorker,
  cachedHouseTypesTE,
  houseGroupTE,
  BuildXScene,
  ScopeElement,
  CachedHouseType,
  HouseGroup,
  OpeningsChangeInfo,
  SceneContextModeLabel,
  SceneContextMode,
  useProjectData,
  useProjectCurrency,
  useOrderListData,
  useAnalyseData,
  useHouses,
};
