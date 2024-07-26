import userCache, { PROJECT_DATA_KEY } from "../data/user/cache";
import {
  encodeShareUrlPayload,
  updateShareUrlPayload,
} from "../data/user/utils";
import { liveQuery } from "dexie";

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
  const encodedShareUrlPayload = encodeShareUrlPayload({ houses, polygon });

  if (encodedShareUrlPayload !== projectData?.shareUrlPayload) {
    updateShareUrlPayload(encodedShareUrlPayload);
  }
};

const watcher = () => liveQuery(querier).subscribe(subscriber);

const SharingWorkerUtils = {
  querier,
  subscriber,
  watcher,
};

export default SharingWorkerUtils;
