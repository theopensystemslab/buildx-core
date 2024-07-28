import {
  HouseGroup,
  HouseGroupManagers,
} from "@/three/objects/house/HouseGroup";
import { O, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import columnLayoutGroupTE from "./columnLayoutGroupTE";
import { getFriendlyNameTE } from "@/data/user/houses";
import { nanoid } from "nanoid";

// Define a type for the houseGroupTE function
type HouseGroupParams = {
  systemId: string;
  dnas: string[];
  houseId?: string;
  houseTypeId: string;
  friendlyName?: string;
  position?: { x: number; y: number; z: number };
  rotation?: number;
  managers?: Partial<HouseGroupManagers>;
};

const createHouseGroupTE = ({
  systemId,
  dnas,
  friendlyName,
  houseId = nanoid(),
  houseTypeId,
  position,
  rotation,
  managers = {},
}: HouseGroupParams): TE.TaskEither<Error, HouseGroup> =>
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
              managers,
            })
          )
        )
      )
    )
  );

export default createHouseGroupTE;
