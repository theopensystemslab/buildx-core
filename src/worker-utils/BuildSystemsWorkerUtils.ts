import { allBuildSystemsData, housePriorityDataTE } from "@/data/build-systems";
import { unwrapTaskEither } from "@/utils/functions";

const loadAllBuildSystemsData = () => unwrapTaskEither(allBuildSystemsData);

const loadHousePriorityData = () => unwrapTaskEither(housePriorityDataTE);

const BuildSystemsWorkerUtils = {
  loadAllBuildSystemsData,
  loadHousePriorityData,
};

export default BuildSystemsWorkerUtils;
