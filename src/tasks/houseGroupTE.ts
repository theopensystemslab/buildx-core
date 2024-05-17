import { HouseGroup } from "@/three/objects/house/HouseGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import columnLayoutGroupTE from "./columnLayoutGroupTE";

const houseGroupTE = ({
  systemId,
  dnas,
  friendlyName,
  houseId,
  houseTypeId,
}: {
  systemId: string;
  friendlyName: string;
  houseId: string;
  houseTypeId: string;
  dnas: string[];
}): TE.TaskEither<Error, HouseGroup> =>
  pipe(
    { systemId, dnas },
    columnLayoutGroupTE,
    TE.map(
      (initialColumnLayoutGroup) =>
        new HouseGroup({
          initialColumnLayoutGroup,
          userData: {
            systemId,
            houseId,
            houseTypeId,
            friendlyName,
          },
        })
    )
  );

export default houseGroupTE;
