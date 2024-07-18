import { applyPlanarProjectionUVs } from "@/three/utils/applyPlanarProjectionUVs";
import { A, O, R, runUntilFirstSuccess, T, TE } from "@/utils/functions";
import speckleIfcParser from "@/utils/speckle/speckleIfcParser";
import ObjectLoader, { SpeckleObject } from "@speckle/objectloader";
import { flow, pipe } from "fp-ts/lib/function";
import { gql, request } from "graphql-request";
import { produce } from "immer";
import {
  BufferGeometry,
  BufferGeometryLoader,
  NormalBufferAttributes,
} from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { cachedModulesTE } from "./modules";
import { useLiveQuery } from "dexie-react-hooks";
import buildSystemsCache from "./cache";

const bufferGeometryLoader = new BufferGeometryLoader();

export type BuildModel = {
  speckleBranchUrl: string;
  geometries: Record<string, BufferGeometry<NormalBufferAttributes>>;
};

export type CachedBuildModel = {
  speckleBranchUrl: string;
  geometries: any;
};

const extractStreamId = (urlString: string) => {
  const url = new URL(urlString);
  const pathParts = url.pathname.split("/");
  const streamIdIndex = pathParts.indexOf("streams") + 1;
  return pathParts[streamIdIndex];
};

const document = gql`
  query Stream($streamId: String!) {
    stream(id: $streamId) {
      branch(name: "main") {
        commits(limit: 1) {
          totalCount
          items {
            referencedObject
          }
        }
      }
    }
  }
`;

export const speckleObjectTE = (
  speckleBranchUrl: string
): TE.TaskEither<Error, SpeckleObject> => {
  const streamId = extractStreamId(speckleBranchUrl);

  return pipe(
    TE.tryCatch(
      () => request("https://speckle.xyz/graphql", document, { streamId }),
      (error) =>
        new Error(
          `Failed to fetch stream data: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
    ),
    TE.chain((data: any) => {
      const objectId = data.stream.branch.commits.items[0].referencedObject;

      const loader = new ObjectLoader({
        serverUrl: "https://speckle.xyz",
        streamId,
        objectId,
        options: {
          enableCaching: false,
          excludeProps: [],
          customLogger: () => {},
          customWarner: () => {},
          fullyTraverseArrays: undefined,
        },
      });

      return TE.tryCatch<Error, SpeckleObject | SpeckleObject[]>(
        // Error here:
        T.of(loader.getAndConstructObject(() => {})),
        (error) =>
          new Error(
            `Failed to load object: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
      );
    }),
    TE.chain((result) =>
      Array.isArray(result)
        ? TE.left(new Error("Unexpected array returned from getSpeckleObject"))
        : TE.right(result)
    )
  );
};

export const speckleObjectToGeometries = flow(
  speckleIfcParser.parse,
  A.reduce(
    {},
    (acc: { [e: string]: BufferGeometry[] }, { ifcTag, geometry }) => {
      return produce(acc, (draft) => {
        if (ifcTag in draft) draft[ifcTag].push(geometry);
        else draft[ifcTag] = [geometry];
      });
    }
  ),
  R.map((geoms) => mergeBufferGeometries(geoms)),
  R.filterMap((bg: BufferGeometry | null) =>
    bg === null ? O.none : O.some(applyPlanarProjectionUVs(bg))
  )
);

export const remoteModelTE = (
  speckleBranchUrl: string
): TE.TaskEither<Error, BuildModel> =>
  pipe(
    speckleBranchUrl,
    speckleObjectTE,
    TE.map(
      flow(speckleObjectToGeometries, (geometries) => ({
        geometries,
        speckleBranchUrl,
      }))
    )
  );

export const remoteModelsTE: TE.TaskEither<Error, BuildModel[]> = pipe(
  cachedModulesTE,
  TE.chain(
    flow(
      A.traverse(TE.ApplicativePar)(({ speckleBranchUrl }) =>
        pipe(remoteModelTE(speckleBranchUrl))
      )
    )
  )
);

export const localModelTE = (
  speckleBranchUrl: string
): TE.TaskEither<Error, BuildModel> => {
  return pipe(
    TE.tryCatch(
      () => buildSystemsCache.models.get(speckleBranchUrl),
      (reason) => new Error(String(reason))
    ),
    TE.flatMap(
      flow(
        O.fromNullable,
        TE.fromOption(
          () => new Error(`no model in cache for ${speckleBranchUrl}`)
        )
      )
    ),
    TE.map(({ speckleBranchUrl, geometries }) => {
      return {
        speckleBranchUrl,
        geometries: pipe(
          geometries,
          R.map(
            (x) =>
              bufferGeometryLoader.parse(
                x
              ) as BufferGeometry<NormalBufferAttributes>
          )
        ),
      };
    })
  );
};

export const getCachedModelTE = (speckleBranchUrl: string) => {
  return runUntilFirstSuccess([
    localModelTE(speckleBranchUrl),
    pipe(
      remoteModelTE(speckleBranchUrl),
      TE.map((remoteModel) => {
        const { speckleBranchUrl, geometries } = remoteModel;

        buildSystemsCache.models.put({
          speckleBranchUrl,
          geometries: pipe(
            geometries,
            R.map((geometry) => geometry.toJSON())
          ),
        });
        return remoteModel;
      })
    ),
  ]);
};

export const localModelsTE: TE.TaskEither<Error, BuildModel[]> = TE.tryCatch(
  () =>
    buildSystemsCache.models.toArray().then((models) => {
      if (A.isEmpty(models)) {
        throw new Error("No models found in cache");
      }

      return models.map((x) => ({
        ...x,
        geometries: pipe(
          x.geometries,
          R.map(
            (x) =>
              bufferGeometryLoader.parse(
                x
              ) as BufferGeometry<NormalBufferAttributes>
          )
        ),
      }));
    }),
  (reason) => (reason instanceof Error ? reason : new Error(String(reason)))
);

export const cachedModelsTE = runUntilFirstSuccess([
  localModelsTE,
  pipe(
    remoteModelsTE,
    TE.map((models) => {
      buildSystemsCache.models.bulkPut(models);
      return models;
    })
  ),
]);

export const useBuildModels = (): BuildModel[] =>
  useLiveQuery(() => buildSystemsCache.models.toArray(), [], []);
