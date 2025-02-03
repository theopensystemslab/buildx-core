import { O, TE } from "@/utils/functions";
import { Buffer } from "buffer";
import { PromiseExtended } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { flow, pipe } from "fp-ts/lib/function";
import { Polygon } from "geojson";
import { Base64 } from "js-base64";
import { deflate, inflate } from "pako";
import { z } from "zod";
import userCache, {
  defaultProjectData,
  getDefaultProjectData,
  PROJECT_DATA_KEY,
} from "./cache";
import { houseParser } from "./houses";
import { polygonGeometryParser } from "./polygon";

export const useProjectData = () =>
  useLiveQuery(
    () => userCache.projectData.get(PROJECT_DATA_KEY),
    [PROJECT_DATA_KEY],
    defaultProjectData
  ) ?? defaultProjectData;

export const useProjectCurrency = () => {
  const { region } = useProjectData();
  const symbol = region === "UK" ? "£" : "€";
  const code = region === "UK" ? "GBP" : "EUR";

  function formatNumberWithK(number: number): string {
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + "k";
    } else {
      return number.toString();
    }
  }

  function kformat(number: number): string {
    return `${symbol}${formatNumberWithK(number)}`;
  }

  function formatWhole(number: number): string {
    return `${symbol}${Math.round(number).toLocaleString()}`;
  }

  function formatDecimal(number: number): string {
    return `${symbol}${number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return {
    symbol,
    code,
    format: formatWhole,
    kformat,
    formatWhole,
    formatDecimal,
  };
};

export const updateShareUrlPayload = (shareUrlPayload: string) => {
  userCache.projectData.update(PROJECT_DATA_KEY, { shareUrlPayload });
};

export const polygonTE: TE.TaskEither<Error, Polygon> = pipe(
  () =>
    userCache.projectData.get(PROJECT_DATA_KEY).then(
      flow(
        O.fromNullable,
        O.chain((x) => O.fromNullable(x.polygon))
      )
    ),
  TE.fromTaskOption(() => Error("No project data found"))
);

export const updateLocatePolygon = (polygon: Polygon | null) => {
  userCache.projectData.get(PROJECT_DATA_KEY).then((x) => {
    if (typeof x === "undefined") {
      userCache.projectData.put({ ...getDefaultProjectData(), polygon });
    } else {
      userCache.projectData.update(PROJECT_DATA_KEY, { polygon });
    }
  });
};

export const useLocatePolygon = () =>
  useLiveQuery(
    async (): Promise<Polygon | null> => {
      const projectData = await userCache.projectData.get(PROJECT_DATA_KEY);
      return projectData?.polygon ?? null;
    },
    [],
    null
  );

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
    houses: z.array(houseParser).nullish().default([]),
    polygon: polygonGeometryParser.nullish().default(null),
    projectName: z.string().default("Copy of New Project"),
  }).parse
);

export const deleteProject = () => {
  const dbs = [
    userCache,
    // exportsDB
  ];

  // Create an array to hold all the promises
  const clearTablePromises: PromiseExtended<void>[] = [];

  dbs.forEach((database) => {
    database.tables.forEach((table) => {
      // Assume `clear()` returns a promise. Push each promise to the array.
      clearTablePromises.push(table.clear());
    });
  });

  // trashMapPolygon();

  // Wait for all the clear table promises to resolve
  return Promise.all(clearTablePromises);
};
