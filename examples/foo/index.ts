import { createBasicScene } from "@/index";
import columnLayoutTE from "@/tasks/columnLayoutTE";
import { isModuleGroup } from "@/three/objects/house/ModuleGroup";
import { TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { AxesHelper } from "three";

const { addObjectToScene, render } = createBasicScene({
  outliner: (object) => {
    return object.parent && isModuleGroup(object.parent)
      ? object.parent.children
      : [];
  },
});

addObjectToScene(new AxesHelper());

// pipe(
//   sequenceT(TE.ApplicativePar)(
//     cachedHouseTypesTE,
//     cachedModulesTE,
//     cachedElementsTE,
//     cachedMaterialsTE
//   ),
//   TE.map(([houseTypes, modules, elements, materials]) => {
//     console.log({ houseTypes, modules, elements, materials });

//     pipe(
//       modules,
//       A.head,
//       TE.fromOption(() => Error("how dare u")),
//       TE.flatMap(({ speckleBranchUrl }) => cachedModelTE(speckleBranchUrl))
//     )().then((yo) => {
//       console.log({ yo });
//     });
//   })
// )();

pipe(
  columnLayoutTE({ houseTypeIndex: 1 }),
  TE.map((columnLayoutGroup) => {
    addObjectToScene(columnLayoutGroup);
  })
)();
