import { Buffer } from "buffer";
import userCache, { updateSaveString } from "@/data/user/cache";
import { Base64 } from "js-base64";
import { liveQuery } from "dexie";
import { flow } from "fp-ts/lib/function";
import * as pako from "pako";

const textDecoder = new TextDecoder();

export const decodeEncodedStoragePayload = flow(
  Base64.toUint8Array,
  pako.inflate,
  (x) => textDecoder.decode(x),
  JSON.parse
);

const textEncoder = new TextEncoder();

const compressEncode = flow(
  JSON.stringify,
  (s) => textEncoder.encode(s),
  (x) => Buffer.from(pako.deflate(x)),
  Base64.fromUint8Array
);

liveQuery(() => userCache.houses.toArray()).subscribe((houses) => {
  updateSaveString(compressEncode(houses));
});
