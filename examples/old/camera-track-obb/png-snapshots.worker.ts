import { PngSnapshotsWorkerUtils } from "@/worker-utils";

self.onmessage = PngSnapshotsWorkerUtils.onHouseUpdate;
