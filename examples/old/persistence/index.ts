import { defaultCachedHousesOps } from "@/data/user/houses";
import { allBuildSystemsData } from "@/index";
import BuildXScene from "@/three/objects/scene/BuildXScene";
import { addKeyHelperListeners } from "@@/examples/utils";

// cachedHouseTypesTE();

// right-click delete house

// persist

allBuildSystemsData().then(() => {
  const scene = new BuildXScene({
    ...defaultCachedHousesOps,
    onRightClickBuildElement: (x) => {
      x.elementGroup.houseGroup.removeFromParent();
    },
  });

  addKeyHelperListeners(scene);
});

// pipe(
//   localHousesTE,
//   TE.chain(flow(A.traverse(TE.ApplicativePar)(createHouseGroupTE))),
//   TE.map(
//     A.map((houseGroup) => {
//       scene.addHouseGroup(houseGroup);
//     })
//   )
// )();

// pipe(
//   cachedHouseTypesTE,
//   TE.map((houseTypes) => {
//     window.addEventListener("keydown", ({ key }) => {
//       const numbers = NEA.range(0, houseTypes.length - 1);

//       if (key === "m") {
//         scene.contextManager?.contextUp();
//       }

//       if (key === "r") {
//         scene.traverse((node) => {
//           if (node instanceof HouseGroup) {
//             node.managers.layouts.resetToHouseTypeLayoutGroup();
//           }
//         });
//       }

//       if (key === "x") {
//         scene.traverse((node) => {
//           if (node instanceof HouseGroup) {
//             node.managers.cuts?.toggleXCut();
//             node.managers.cuts?.createClippedBrushes(node);
//             node.managers.cuts?.showAppropriateBrushes(node);
//             // node.managers.cuts?.syncActiveLayout();
//           }
//         });
//       }
//       if (key === "z") {
//         scene.traverse((node) => {
//           if (node instanceof HouseGroup) {
//             node.managers.cuts?.toggleZCut();
//             node.managers.cuts?.createClippedBrushes(node);
//             // node.managers.cuts?.syncActiveLayout();
//             node.managers.cuts?.showAppropriateBrushes(node);
//           }
//         });
//       }

//       if (numbers.includes(Number(key))) {
//         pipe(
//           houseTypes,
//           A.lookup(Number(key)),
//           TE.fromOption(() =>
//             Error(
//               `no houseType ${key} in houseTypes of length ${houseTypes.length}`
//             )
//           ),
//           TE.chain(({ id: houseTypeId, systemId, dnas }) =>
//             createHouseGroupTE({
//               systemId,
//               dnas,
//               houseId: nanoid(),
//               houseTypeId,
//             })
//           ),
//           TE.map((houseGroup) => {
//             scene.addHouseGroup(houseGroup);
//           })
//         )();
//       }
//     });
//   })
// )();
