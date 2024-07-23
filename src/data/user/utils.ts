import { formatCurrency } from "@/utils/format";
import { useLiveQuery } from "dexie-react-hooks";
import { flow, pipe } from "fp-ts/lib/function";
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
import { PromiseExtended } from "dexie";
import { Polygon } from "geojson";
import { polygonFeatureParser } from "./polygon";
import { O, TE } from "@/utils/functions";

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

  return {
    symbol,
    code,
    format: (x: number) => formatCurrency(x, code),
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
  userCache.projectData.update(PROJECT_DATA_KEY, { polygon });
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
    houses: z.array(houseParser),
    polygon: polygonFeatureParser.nullish().default(null),
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
