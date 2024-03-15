import { BuildModule } from "@/systemsData/modules";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, T } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Object3D } from "three";
import { Operation, OperationGroup } from "three-bvh-csg";
import { ElementMeshUserData, UserDataTypeEnum } from "./types";
import { sequenceT } from "fp-ts/lib/Apply";

export const isModuleGroup = (node: Object3D): node is ModuleGroup =>
  node.userData?.type === UserDataTypeEnum.Enum.ModuleGroup;

export type ModuleGroupUserData = {
  type: typeof UserDataTypeEnum.Enum.ModuleGroup;
  gridGroupIndex: number;
  dna: string;
  length: number;
  z: number;
};

export class ModuleGroup extends OperationGroup {
  userData: ModuleGroupUserData;

  constructor(userData: ModuleGroupUserData) {
    super();
    this.userData = userData;
  }
}

const createModuleGroup = ({
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
}): T.Task<ModuleGroup> => {
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

  const operationsTask = pipe(
    getIfcGeometries(speckleBranchUrl),
    T.chain((modelGeometries) =>
      // element meshes
      pipe(
        Object.entries(modelGeometries),
        A.traverse(T.ApplicativeSeq)(([ifcTag, geometry]) => {
          return pipe(
            sequenceT(T.ApplicativePar)(
              getBuildElement({ systemId, ifcTag }),
              getInitialThreeMaterial({ systemId, ifcTag })
            ),
            T.map(([element, material]) => {
              const operation = new Operation(geometry, material);
              operation.castShadow = true;
              const elementMeshUserData: ElementMeshUserData = {
                type: UserDataTypeEnum.Enum.ElementMesh,
                ifcTag,
                category: element.category,
              };
              operation.userData = elementMeshUserData;
              return operation;
            })
          );
        })
      )
    )
  );

  return pipe(
    operationsTask,
    T.map((operations) => {
      moduleGroup.add(...operations);
      return moduleGroup;
    })
  );
};

export default createModuleGroup;
