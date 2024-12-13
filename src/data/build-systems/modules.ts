import airtable from "@/utils/airtable";
import { A, runUntilFirstSuccess, TE } from "@/utils/functions";
import { QueryParams } from "airtable/lib/query_params";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { allSystemIds, systemFromId } from "./systems";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";
// import { useAllWindowTypes } from "../../app/db/systems";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const moduleSelector: QueryParams<any> = {
  filterByFormula: 'speckle_branch_url!=""',
};

export type StructuredDna = {
  level: number;
  levelType: string;
  positionType: "END" | "MID";
  sectionType: string;
  gridType: string;
  gridUnits: number;
  stairsType: string;
  internalLayoutType: string;
  windowTypeSide1: string;
  windowTypeSide2: string;
  windowTypeEnd: string;
  windowTypeTop: string;
};

export const parseDna = (dna: string): StructuredDna => {
  const chunks = dna.split("-");
  const levelType = chunks[2];
  const levelLetter = chunks[2]?.[0];
  const typeLetter = chunks[1]?.[0]?.toUpperCase();
  const sectionType = chunks[0] ?? "S1";
  const gridType = chunks[3] ?? "GRID1";
  const gridUnits = Number(chunks[4]) ?? 1;
  const stairsType = chunks[5] ?? "ST0";
  const internalLayoutType = chunks[6] ?? "L0";
  const windowTypeSide1 = chunks[7] ?? "SIDE0";
  const windowTypeSide2 = chunks[8] ?? "SIDE0";
  const windowTypeEnd = chunks[9] ?? "END0";
  const windowTypeTop = chunks[10] ?? "TOP0";

  return {
    sectionType,
    positionType: typeLetter === "E" ? "END" : "MID",
    levelType,
    level: ["F", "G", "M", "T", "R"].indexOf(levelLetter),
    gridType,
    gridUnits,
    stairsType,
    internalLayoutType,
    windowTypeSide1,
    windowTypeSide2,
    windowTypeEnd,
    windowTypeTop,
  };
};

export type BuildModule = { systemId: string } & z.infer<typeof moduleParser>;

export const moduleParser = z
  .object({
    id: z.string().min(1),
    fields: z.object({
      module_code: z.string().min(1),
      speckle_branch_url: z.string().min(1),
      section_width: z.array(z.number()),
      level_height: z.array(z.number()),
      length_dims: z.number().default(0),
      floor_area: z.number().default(0),
      cladding_area: z.number().default(0),
      lining_area: z.number().default(0),
      roofing_area: z.number().default(0),
      concrete_volume: z.number().default(0),
      flashing_area: z.number().default(0),
      gutter_length: z.number().default(0),
      downpipe_length: z.number().default(0),
      footings_count: z.number().default(0),
      decking_area: z.number().default(0),
      soleplate_length: z.number().default(0),
      space_type: z.array(z.string().optional()).optional(),
      baseline_module_cost: z.number().optional(),
      embodied_carbon: z.number().optional(),
      visual_reference: z
        .array(z.object({ url: z.string().optional() }).optional())
        .optional(),
      description: z.string().default(""),
      last_modified: z.string().refine(
        (value) => {
          // Attempt to parse the value as a date and check that it's valid
          const date = new Date(value);
          return !isNaN(date.getTime());
        },
        {
          // Custom error message
          message: "Invalid date string",
        }
      ),
      foundation_labour_hours: z.number().default(0),
      chassis_labour_hours: z.number().default(0),
      exterior_labour_hours: z.number().default(0),
      interior_labour_hours: z.number().default(0),
    }),
  })
  .transform(
    ({
      id,
      fields: {
        module_code,
        speckle_branch_url,
        section_width: [width],
        level_height: [height],
        length_dims: length,
        floor_area: floorArea,
        cladding_area: claddingArea,
        lining_area: liningArea,
        roofing_area: roofingArea,
        concrete_volume: concreteVolume,
        length_dims: lengthDims,
        flashing_area: flashingArea,
        gutter_length: gutterLength,
        downpipe_length: downpipeLength,
        footings_count: footingsCount,
        decking_area: deckingArea,
        soleplate_length: soleplateLength,
        space_type,
        baseline_module_cost,
        embodied_carbon,
        visual_reference,
        description,
        last_modified,
        foundation_labour_hours,
        chassis_labour_hours,
        exterior_labour_hours,
        interior_labour_hours,
      },
    }) => ({
      id,
      dna: module_code,
      speckleBranchUrl: speckle_branch_url,
      structuredDna: parseDna(module_code),
      length,
      height,
      width,
      floorArea,
      claddingArea,
      liningArea,
      roofingArea,
      concreteVolume,
      lengthDims,
      flashingArea,
      gutterLength,
      downpipeLength,
      footingsCount,
      soleplateLength,
      deckingArea,
      spaceType: space_type?.[0] ?? "NONE",
      cost: baseline_module_cost ?? 1500,
      embodiedCarbon: embodied_carbon ?? -400,
      description,
      visualReference: visual_reference?.[0]?.url,
      lastModified: new Date(last_modified).getTime(),
      foundationLabourHours: foundation_labour_hours,
      chassisLabourHours: chassis_labour_hours,
      exteriorLabourHours: exterior_labour_hours,
      interiorLabourHours: interior_labour_hours,
    })
  );

export const modulesQuery = (input?: { systemIds: string[] }) => {
  const { systemIds = allSystemIds } = input ?? {};

  return pipe(
    systemIds,
    A.map((systemId) =>
      pipe(
        airtable
          .base(systemFromId(systemId)?.airtableId ?? "")
          .table("modules")
          .select(moduleSelector)
          .all()
          .then(
            z.array(moduleParser.transform((xs) => ({ ...xs, systemId }))).parse
          )
      )
    ),
    (ps) => Promise.all(ps).then(A.flatten)
  );
};

export const remoteModulesTE: TE.TaskEither<Error, BuildModule[]> = TE.tryCatch(
  () => modulesQuery(),
  (reason) =>
    new Error(
      `Failed to fetch modules: ${
        reason instanceof Error ? reason.message : String(reason)
      }`
    )
);

// async () => {
//   const speckleObject = await getSpeckleObject(speckleBranchUrl);
// };

// export const useGetModuleWindowTypes = () => {
//   const windowTypes = useAllWindowTypes();

//   return (module: Module) =>
//     pipe(
//       module.structuredDna,
//       R.reduceWithIndex(S.Ord)([], (key, acc: WindowType[], value) => {
//         switch (key) {
//           case "windowTypeEnd":
//           case "windowTypeSide1":
//           case "windowTypeSide2":
//           case "windowTypeTop":
//             return pipe(
//               windowTypes,
//               A.findFirstMap(wt =>
//                 wt.code === value ? O.some([...acc, wt]) : O.none
//               ),
//               O.getOrElse(() => acc)
//             );
//           default:
//             return acc;
//         }
//       })
//     );
// };

export const localModulesTE: TE.TaskEither<Error, BuildModule[]> = TE.tryCatch(
  () =>
    buildSystemsCache.modules.toArray().then((modules) => {
      if (A.isEmpty(modules)) {
        throw new Error("No modules found in cache");
      }
      return modules;
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedModulesTE = runUntilFirstSuccess([
  localModulesTE,
  pipe(
    remoteModulesTE,
    TE.map((modules) => {
      buildSystemsCache.modules.bulkPut(modules);
      return modules;
    })
  ),
]);

export const useBuildModules = (): BuildModule[] =>
  useLiveQuery(() => buildSystemsCache.modules.toArray(), [], []);

export const useSystemModules = (systemId: string): BuildModule[] =>
  useLiveQuery(
    () =>
      buildSystemsCache.modules.where("systemId").equals(systemId).toArray(),
    [],
    []
  );
