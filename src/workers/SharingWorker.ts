import userCache from "@/data/user/cache";
import {
  encodeShareUrlPayload,
  updateShareUrlPayload,
} from "@/data/user/utils";
import { liveQuery } from "dexie";

liveQuery(() => userCache.houses.toArray()).subscribe((houses) => {
  const encodedShareUrlPayload = encodeShareUrlPayload({ houses });
  updateShareUrlPayload(encodedShareUrlPayload);
  console.log({ encodedShareUrlPayload });
});
