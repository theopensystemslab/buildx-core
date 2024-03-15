import { BuildModule } from "@/systemsData/modules";
import { DefaultGetters } from "@/tasks/defaultory";
import { A } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group, Object3D } from "three";
import { Brush } from "three-bvh-csg";
import { ElementMeshUserData, UserDataTypeEnum } from "./types";

export const isModuleGroup = (node: Object3D): node is ModuleGroup =>
  node.userData?.type === UserDataTypeEnum.Enum.ModuleGroup;

export type ModuleGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ModuleGroup;
  gridGroupIndex: number;
  dna: string;
  length: number;
  z: number;
};

export class ModuleGroup extends Group {
  userData: ModuleGroupUserData;

  constructor(userData: ModuleGroupUserData) {
    super();
    this.userData = userData;
  }
}

const createModuleGroup = async ({
  gridGroupIndex,
  module: { systemId, speckleBranchUrl, length, dna },
  flip,
  z,
  getIfcGeometries,
  getBuildElement,
  getInitialThreeMaterial,
}: DefaultGetters & {
  gridGroupIndex: number;
  module: BuildModule;
  flip: boolean;
  z: number;
  // getIfcGeometries: (
  //   speckleBranchUrl: string
  // ) => Promise<Record<string, BufferGeometry>>;
  // getBuildElement: (ifcTag: string) => BuildElement;
  // getInitialThreeMaterial: (ifcTag: string) => Material;
}): Promise<ModuleGroup> => {
  const moduleGroupUserData: ModuleGroupUserData = {
    type: UserDataTypeEnum.Enum.ModuleGroup,
    gridGroupIndex,
    dna,
    length,
    z,
  };

  const moduleGroup = new ModuleGroup(moduleGroupUserData);

  moduleGroup.userData = moduleGroupUserData;
  moduleGroup.scale.set(1, 1, flip ? 1 : -1);
  moduleGroup.position.set(0, 0, flip ? z + length / 2 : z - length / 2);

  const modelGeometries = await getIfcGeometries(speckleBranchUrl);

  // element meshes
  pipe(
    Object.entries(modelGeometries),
    A.map(([ifcTag, geometry]) => {
      const element = getBuildElement({ systemId, ifcTag });
      const material = getInitialThreeMaterial({ systemId, ifcTag });
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

  // if (visible) setVisibleAndRaycast(moduleGroup);
  // else setInvisibleNoRaycast(moduleGroup);

  return moduleGroup;
};

export default createModuleGroup;
