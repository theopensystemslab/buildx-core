import { cachedModulesTE } from "@/build-systems/cache";
import {
  createColumnLayout,
  dnasToModules,
  modulesToMatrix,
} from "@/layouts/ops";
import {
  ColumnLayoutGroup,
  createColumnLayoutGroup,
} from "@/three/objects/house/ColumnLayoutGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";

const columnLayoutGroupTE = ({
  systemId,
  dnas,
}: {
  systemId: string;
  dnas: string[];
}): TE.TaskEither<Error, ColumnLayoutGroup> =>
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

export default columnLayoutGroupTE;
