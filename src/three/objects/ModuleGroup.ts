import { BuildModule } from "@/systemsData/modules";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, T } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { Object3D } from "three";
import { Operation, OperationGroup, SUBTRACTION } from "three-bvh-csg";
import { ElementMeshUserData, UserDataTypeEnum } from "./types";

export const isModuleGroup = (node: Object3D): node is ModuleGroup =>
  node.userData?.type === UserDataTypeEnum.Enum.ModuleGroup;

export type ModuleGroupUserData = BuildModule & {
  type: typeof UserDataTypeEnum.Enum.ModuleGroup;
  gridGroupIndex: number;
  // dna: string;
  // length: number;
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
  buildModule,
  flip,
  z,
  getIfcGeometries,
  getBuildElement,
  getInitialThreeMaterial,
}: DefaultGetters & {
  gridGroupIndex: number;
  buildModule: BuildModule;
  flip: boolean;
  z: number;
}): T.Task<ModuleGroup> => {
  const moduleGroupUserData: ModuleGroupUserData = {
    ...buildModule,
    type: UserDataTypeEnum.Enum.ModuleGroup,
    gridGroupIndex,
    // dna,
    // length,
    z,
  };

  const { systemId, speckleBranchUrl, length } = buildModule;

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
              const elementOp = new Operation(geometry, material);
              elementOp.castShadow = true;
              // @ts-ignore
              elementOp.operation = SUBTRACTION;
              const elementMeshUserData: ElementMeshUserData = {
                type: UserDataTypeEnum.Enum.ElementMesh,
                ifcTag,
                category: element.category,
              };
              elementOp.userData = elementMeshUserData;
              return elementOp;
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
