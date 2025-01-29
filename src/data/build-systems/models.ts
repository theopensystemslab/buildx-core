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

const parseSpeckleModelUrl = (urlString: string) => {
  const url = new URL(urlString);
  const pathParts = url.pathname.split("/");
  const projectIdIndex = pathParts.indexOf("projects") + 1;
  const modelIdIndex = pathParts.indexOf("models") + 1;
  return {
    projectId: pathParts[projectIdIndex],
    modelId: pathParts[modelIdIndex],
  };
};

// TEST DATA
// https://speckle.xyz/streams/7eed2cc71a/branches/main
// https://app.speckle.systems/projects/171f6792e9/models/fb85d3871b

// streamId: 7eed2cc71a
// modelId: fb85d3871b
// projectId: 171f6792e9

const document = gql`
  query Model($modelId: String!, $projectId: String!) {
    project(id: $projectId) {
      model(id: $modelId) {
        versions(limit: 1) {
          items {
            id
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
  const { projectId, modelId } = parseSpeckleModelUrl(speckleBranchUrl);

  return pipe(
    TE.tryCatch(
      () =>
        request("https://app.speckle.systems/graphql", document, {
          projectId,
          modelId,
        }),
      (error) =>
        new Error(
          `Failed to fetch stream data: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
    ),
    TE.chain((data: any) => {
      const objectId = data.project.model.versions.items[0].referencedObject;

      const loader = new ObjectLoader({
        serverUrl: "https://app.speckle.systems",
        streamId: projectId,
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
