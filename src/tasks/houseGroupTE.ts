import { HouseGroup } from "@/three/objects/house/HouseGroup";
import { O, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import columnLayoutGroupTE from "./columnLayoutGroupTE";
import { getFriendlyNameTE } from "@/user-data/houses";
import { nanoid } from "nanoid";

const houseGroupTE = ({
  systemId,
  dnas,
  friendlyName,
  houseId = nanoid(),
  houseTypeId,
  position,
  rotation,
}: {
  systemId: string;
  friendlyName?: string;
  houseId?: string;
  houseTypeId: string;
  dnas: string[];
  position?: { x: number; y: number; z: number };
  rotation?: number;
}): TE.TaskEither<Error, HouseGroup> =>
  pipe(
    friendlyName,
    O.fromNullable,
    O.match(getFriendlyNameTE, TE.of),
    TE.chain((friendlyName) =>
      pipe(
        { systemId, dnas },
        columnLayoutGroupTE,
        TE.chain((initialColumnLayoutGroup) =>
          TE.of(
            new HouseGroup({
              initialColumnLayoutGroup,
              userData: {
                systemId,
                houseId,
                houseTypeId,
                friendlyName,
              },
              position,
              rotation,
            })
          )
        )
      )
    )
  );

export default houseGroupTE;
