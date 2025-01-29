import { applyPlanarProjectionUVs } from "@/three/utils/applyPlanarProjectionUVs";
import { A, O, R, runUntilFirstSuccess, T, TE } from "@/utils/functions";
import speckleIfcParser from "@/utils/speckle/speckleIfcParser";
import ObjectLoader, { SpeckleObject } from "@speckle/objectloader";
import { useLiveQuery } from "dexie-react-hooks";
import { flow, pipe } from "fp-ts/lib/function";
import { gql, request } from "graphql-request";
import { produce } from "immer";
import {
  BufferGeometry,
  BufferGeometryLoader,
  NormalBufferAttributes,
} from "three";
import { mergeBufferGeometries } from "three-stdlib";
import buildSystemsCache from "./cache";
import { cachedModulesTE } from "./modules";

const bufferGeometryLoader = new BufferGeometryLoader();

export type BuildModel = {
  speckleBranchUrl: string;
  geometries: Record<string, BufferGeometry<NormalBufferAttributes>>;
};

export type CachedBuildModel = {
  speckleBranchUrl: string;
  geometries: any;
};

type SpeckleUrlFormat =
  | { type: "stream"; streamId: string }
  | { type: "project"; projectId: string; modelId: string };

const parseSpeckleUrl = (urlString: string): SpeckleUrlFormat => {
  const url = new URL(urlString);
  const pathParts = url.pathname.split("/");

  // Check for streams format
  const streamIdIndex = pathParts.indexOf("streams") + 1;
  if (streamIdIndex > 0 && pathParts[streamIdIndex]) {
    return { type: "stream", streamId: pathParts[streamIdIndex] };
  }

  // Check for projects/models format
  const projectIdIndex = pathParts.indexOf("projects") + 1;
  const modelIdIndex = pathParts.indexOf("models") + 1;
  if (projectIdIndex > 0 && modelIdIndex > 0) {
    return {
      type: "project",
      projectId: pathParts[projectIdIndex],
      modelId: pathParts[modelIdIndex],
    };
  }

  throw new Error("Invalid Speckle URL format");
};

const streamDocument = gql`
  query Stream($streamId: String!) {
    stream(id: $streamId) {
      branch(name: "main") {
        commits(limit: 1) {
          items {
            referencedObject
          }
        }
      }
    }
  }
`;

const modelDocument = gql`
  query Model($modelId: String!, $projectId: String!) {
    project(id: $projectId) {
      model(id: $modelId) {
        versions(limit: 1) {
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
  const urlInfo = parseSpeckleUrl(speckleBranchUrl);

  return pipe(
    TE.tryCatch(
      () => {
        if (urlInfo.type === "stream") {
          return request(
            "https://app.speckle.systems/graphql",
            streamDocument,
            {
              streamId: urlInfo.streamId,
            }
          );
        } else {
          return request("https://app.speckle.systems/graphql", modelDocument, {
            projectId: urlInfo.projectId,
            modelId: urlInfo.modelId,
          });
        }
      },
      (error) =>
        new Error(
          `Failed to fetch stream data: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
    ),
    TE.chain((data: any) => {
      const objectId =
        urlInfo.type === "stream"
          ? data.stream.branch.commits.items[0].referencedObject
          : data.project.model.versions.items[0].referencedObject;

      const streamId =
        urlInfo.type === "stream" ? urlInfo.streamId : urlInfo.projectId;

      const loader = new ObjectLoader({
        serverUrl: "https://app.speckle.systems",
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

export const remoteModelTE = (
  speckleBranchUrl: string
): TE.TaskEither<Error, BuildModel> =>
  pipe(
    speckleBranchUrl,
    speckleObjectTE,
    TE.map(
      flow(speckleObjectToGeometries, (geometries) => ({
        geometries: pipe(
          geometries,
          R.map((geometry: any) => geometry.toJSON())
        ),
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

export const localModelsTE: TE.TaskEither<Error, BuildModel[]> = TE.tryCatch(
  () =>
    buildSystemsCache.models.toArray().then((models) => {
      if (A.isEmpty(models)) {
        throw new Error("No models found in cache");
      }
      return models;
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
