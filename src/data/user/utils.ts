import { formatCurrency } from "@/utils/format";
import { useLiveQuery } from "dexie-react-hooks";
import { flow } from "fp-ts/lib/function";
import { Base64 } from "js-base64";
import { deflate, inflate } from "pako";
import userCache, {
  PROJECT_DATA_KEY,
  ProjectData,
  defaultProjectData,
} from "./cache";
import { z } from "zod";
import { houseParser } from "./houses";
import { Buffer } from "buffer";

export const useProjectData = (): ProjectData =>
  useLiveQuery(
    () => userCache.projectData.get(PROJECT_DATA_KEY) as Promise<ProjectData>,
    [],
    defaultProjectData as ProjectData
  );

export const useProjectCurrency = () => {
  const { region } = useProjectData();
  const symbol = region === "UK" ? "£" : "€";
  const code = region === "UK" ? "GBP" : "EUR";

  // const format = (d: number) => {
  //   const formatted =
  //     Math.abs(d) > 1000
  //       ? `${Math.floor(d / 1000)}k`
  //       : d.toLocaleString("en-GB", {
  //           maximumFractionDigits: 1,
  //         });
  //   return formatted;
  // };

  // const formatWithUnit = (d: number, unitOfMeasurement: string) => {
  //   const formatted = format(d);
  //   const formattedWithUnit = ["€", "£", "$"].includes(unitOfMeasurement)
  //     ? `${unitOfMeasurement}${formatted}`
  //     : `${formatted}${unitOfMeasurement}`;
  //   return formattedWithUnit;
  // };

  return {
    symbol,
    code,
    format: (x: number) => formatCurrency(x, code),
  };
};

export const updateShareUrlPayload = (shareUrlPayload: string) => {
  userCache.projectData.update(PROJECT_DATA_KEY, { shareUrlPayload });
};

const textEncoder = new TextEncoder();

export const encodeShareUrlPayload = flow(
  JSON.stringify,
  (s) => textEncoder.encode(s),
  (x) => Buffer.from(deflate(x)),
  (x) => Base64.fromUint8Array(x, true)
);

export const decodeShareUrlPayload = flow(
  Base64.toUint8Array,
  inflate,
  (x) => new TextDecoder().decode(x),
  JSON.parse,
  z.object({
    houses: z.array(houseParser),
  }).parse
);

// export const decodeShareUrlPayload = (encodedString: string) => {
//   try {
//     const uint8Array = Base64.toUint8Array(encodedString);

//     const inflatedData = inflate(uint8Array);

//     const decodedString = new TextDecoder().decode(inflatedData);

//     const parsedData = JSON.parse(decodedString);

//     const result = z
//       .object({
//         houses: z.array(houseParser),
//       })
//       .parse(parsedData);

//     return result;
//   } catch (error) {
//     console.error("Error decoding share URL payload:", error);
//     throw error;
//   }
// };
