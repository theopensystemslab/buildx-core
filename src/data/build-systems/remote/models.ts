import { applyPlanarProjectionUVs } from "@/three/utils/applyPlanarProjectionUVs";
import { A, O, R, T, TE } from "@/utils/functions";
import speckleIfcParser from "@/utils/speckle/speckleIfcParser";
import ObjectLoader, { SpeckleObject } from "@speckle/objectloader";
import { flow, pipe } from "fp-ts/lib/function";
import { gql, request } from "graphql-request";
import { produce } from "immer";
import { BufferGeometry, NormalBufferAttributes } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { remoteModulesTE } from "./modules";

export type BuildModel = {
  speckleBranchUrl: string;
  geometries: Record<string, BufferGeometry<NormalBufferAttributes>>;
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
  remoteModulesTE,
  TE.chain(
    flow(
      A.traverse(TE.ApplicativePar)(({ speckleBranchUrl }) =>
        pipe(remoteModelTE(speckleBranchUrl))
      )
    )
  )
);
