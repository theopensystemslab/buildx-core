import { cachedModulesTE } from "@/build-systems/cache";
import { HouseType } from "@/build-systems/remote/houseTypes";
import {
  createColumnLayout,
  dnasToModules,
  modulesToMatrix,
} from "@/layouts/ops";
import { createColumnLayoutGroup } from "@/three/objects/house/ColumnLayoutGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";

const columnLayoutTE = ({ systemId, dnas }: HouseType) =>
  pipe(
    cachedModulesTE,
    TE.flatMap((buildModules) =>
      pipe(
        dnas,
        dnasToModules({ systemId, buildModules }),
        modulesToMatrix,
        createColumnLayout,
        (layout) =>
          pipe(
            createColumnLayoutGroup({
              systemId,
              layout,
              dnas,
            })
          )
      )
    )
  );

export default columnLayoutTE;
