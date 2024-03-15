import { applyPlanarProjectionUVs } from "@/three/utils/applyPlanarProjectionUVs";
import { A, O, R, T } from "@/utils/functions";
import getSpeckleObject from "@/utils/speckle/getSpeckleObject";
import speckleIfcParser from "@/utils/speckle/speckleIfcParser";
import { pipe } from "fp-ts/lib/function";
import { produce } from "immer";
import { BufferGeometry, NormalBufferAttributes } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { modulesTask } from "./airtables";

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
  modulesTask,
  T.chain((buildModules) =>
    pipe(
      buildModules,
      A.traverse(T.ApplicativePar)(({ speckleBranchUrl }) => {
        return pipe(
          getModelGeometriesTask(speckleBranchUrl),
          T.map((geoms) => [speckleBranchUrl, geoms] as const)
        );
      }),
      T.map((models) => ({
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
