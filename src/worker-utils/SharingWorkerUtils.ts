import { liveQuery, Subscription } from "dexie";
import { Polygon } from "geojson";
import userCache, { PROJECT_DATA_KEY } from "../data/user/cache";
import {
  encodeShareUrlPayload,
  updateShareUrlPayload,
} from "../data/user/utils";

const querier = async () => {
  const houses = await userCache.houses.toArray();
  const projectData = await userCache.projectData.get(PROJECT_DATA_KEY);
  return { houses, projectData };
};

const subscriber = ({
  houses,
  projectData,
}: Awaited<ReturnType<typeof querier>>) => {
  const polygon = projectData?.polygon ?? null;
  const projectName = `Copy of ` + (projectData?.projectName ?? "New Project");
  const encodedShareUrlPayload = encodeShareUrlPayload({
    houses,
    polygon,
    projectName,
  });

  if (encodedShareUrlPayload !== projectData?.shareUrlPayload) {
    updateShareUrlPayload(encodedShareUrlPayload);
  }
};

const watcher = () => liveQuery(querier).subscribe(subscriber);

let polygonUpdateSubscription: Subscription | null = null;

const createPolygonSubscription = (
  handler: (polygon: Polygon | null) => void
) => {
  if (polygonUpdateSubscription !== null) {
    polygonUpdateSubscription.unsubscribe();
  }
  polygonUpdateSubscription = liveQuery(() =>
    userCache.projectData.get(PROJECT_DATA_KEY).then((x) => x?.polygon)
  ).subscribe((polygon) => {
    handler(polygon ?? null);
  });
};

const SharingWorkerUtils = {
  querier,
  subscriber,
  watcher,
  createPolygonSubscription,
};

export default SharingWorkerUtils;
