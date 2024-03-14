import { T, A, R } from "@/utils/functions";
import getSpeckleObject from "@/utils/speckle/getSpeckleObject";
import speckleIfcParser from "@/utils/speckle/speckleIfcParser";
import { pipe } from "fp-ts/lib/function";
import { produce } from "immer";
import { BufferGeometry, NormalBufferAttributes } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { modulesTask } from "./airtables";

const modelsTask = pipe(
  modulesTask,
  T.chain((buildModules) =>
    pipe(
      buildModules,
      A.traverse(T.ApplicativePar)((buildModule) => async () => {
        const { speckleBranchUrl } = buildModule;
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
          R.filter((bg: BufferGeometry | null): bg is BufferGeometry =>
            Boolean(bg)
          )
        );
        return [speckleBranchUrl, ifcTaggedModelGeometries] as const;
      }),
      // models ends up being an array of tuples
      // is there a nice way for models to be a Record instead here?
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
