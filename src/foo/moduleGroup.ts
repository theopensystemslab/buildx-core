import { BuildModule } from "@/systems/modules";
import { A } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { BufferGeometry, Group, Material } from "three";
import { Brush } from "three-bvh-csg";
import {
  ElementMeshUserData,
  ModuleGroupUserData,
  UserDataTypeEnum,
} from "./userData";
import { BuildElement } from "@/systems/elements";

const createModuleGroup = async ({
  gridGroupIndex,
  module: { speckleBranchUrl, length, dna },
  flip,
  z,
  getIfcTaggedModelGeometries,
  getBuildElement,
  getInitialThreeMaterial,
}: {
  gridGroupIndex: number;
  module: BuildModule;
  flip: boolean;
  z: number;
  getIfcTaggedModelGeometries: (
    speckleBranchUrl: string
  ) => Promise<Record<string, BufferGeometry>>;
  getBuildElement: (ifcTag: string) => BuildElement;
  getInitialThreeMaterial: (ifcTag: string) => Material;
}) => {
  const moduleGroup = new Group(); // as ModuleGroup;

  moduleGroup.scale.set(1, 1, flip ? 1 : -1);
  moduleGroup.position.set(0, 0, flip ? z + length / 2 : z - length / 2);

  const modelGeometries = await getIfcTaggedModelGeometries(speckleBranchUrl);

  // element meshes
  pipe(
    Object.entries(modelGeometries),
    A.map(([ifcTag, geometry]) => {
      const element = getBuildElement(ifcTag);
      const material = getInitialThreeMaterial(ifcTag);
      const brush = new Brush(geometry, material);
      brush.castShadow = true;
      const elementMeshUserData: ElementMeshUserData = {
        type: UserDataTypeEnum.Enum.ElementMesh,
        ifcTag,
        category: element.category,
      };
      brush.userData = elementMeshUserData;
      moduleGroup.add(brush);
    })
  );

  // const setThisModuleGroupVisible = () => {
  //   pipe(
  //     moduleGroup.parent!.children,
  //     A.filter(
  //       (x): x is ModuleGroup =>
  //         isModuleGroup(x) &&
  //         x.userData.gridGroupIndex === moduleGroup.userData.gridGroupIndex &&
  //         x.visible
  //     ),
  //     A.map(moduleGroup => {
  //       setInvisibleNoRaycast(moduleGroup);
  //     })
  //   );

  //   setVisibleAndRaycast(moduleGroup);
  // };

  const moduleGroupUserData: ModuleGroupUserData = {
    type: UserDataTypeEnum.Enum.ModuleGroup,
    gridGroupIndex,
    dna,
    length,
    z,
  };

  moduleGroup.userData = moduleGroupUserData;

  // if (visible) setVisibleAndRaycast(moduleGroup);
  // else setInvisibleNoRaycast(moduleGroup);

  return moduleGroup;
};

export default createModuleGroup;
