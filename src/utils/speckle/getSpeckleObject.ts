import ObjectLoader from "@speckle/objectloader";
import { gql, request } from "graphql-request";

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
const getSpeckleObject = async (speckleBranchUrl: string) => {
  const streamId = extractStreamId(speckleBranchUrl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await request(
    "https://app.speckle.systems/graphql",
    document,
    {
      streamId,
    }
  );

  const objectId =
    data.stream.branch.commits.itelementsTaskems[0].referencedObject;

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

  const result = await loader.getAndConstructObject(() => {});

  if (Array.isArray(result))
    throw new Error("Unexpected array returned from getSpeckleObject");

  return result;
};

export default getSpeckleObject;
