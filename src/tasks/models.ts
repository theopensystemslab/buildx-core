import { cachedModulesTE } from "@/build-systems/cache";
import { applyPlanarProjectionUVs } from "@/three/utils/applyPlanarProjectionUVs";
import { A, O, R, T, TE } from "@/utils/functions";
import getSpeckleObject from "@/utils/speckle/getSpeckleObject";
import speckleIfcParser from "@/utils/speckle/speckleIfcParser";
import { pipe } from "fp-ts/lib/function";
import { produce } from "immer";
import { BufferGeometry, NormalBufferAttributes } from "three";
import { mergeBufferGeometries } from "three-stdlib";

export const getModelGeometriesTask =
  (
    speckleBranchUrl: string
  ): T.Task<Record<string, BufferGeometry<NormalBufferAttributes>>> =>
  async () => {
    const speckleObject = await getSpeckleObject(speckleBranchUrl);
    const ifcTaggedModelGeometries = pipe(
      speckleIfcParser.parse(speckleObject),
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
    return ifcTaggedModelGeometries;
  };

const modelsTask = pipe(
  cachedModulesTE,
  TE.chain((buildModules) =>
    pipe(
      buildModules,
      A.traverse(TE.ApplicativePar)(({ speckleBranchUrl }) => {
        return pipe(
          getModelGeometriesTask(speckleBranchUrl),
          TE.fromTask<
            Record<string, BufferGeometry<NormalBufferAttributes>>,
            Error
          >,
          TE.map((geoms) => [speckleBranchUrl, geoms] as const)
        );
      }),
      TE.map((models) => ({
        models: models.reduce(
          (
            acc: Record<
              string,
              Record<string, BufferGeometry<NormalBufferAttributes>>
            >,
            [speckleBranchUrl, ifcTaggedGeometries]
          ) => ({
            ...acc,
            [speckleBranchUrl]: ifcTaggedGeometries,
          }),
          {}
        ),
        buildModules,
      }))
    )
  )
);

export default modelsTask;
