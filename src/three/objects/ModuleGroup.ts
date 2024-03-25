import { BuildModule } from "@/systemsData/modules";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, T } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { Group, Matrix4, Object3D } from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import createElementGroup, {
  ClippedBrush,
  isClippedBrush,
  isElementBrush,
} from "./ElementGroup";
import { UserDataTypeEnum } from "./types";

export const isModuleGroup = (node: Object3D): node is ModuleGroup =>
  node.userData?.type === UserDataTypeEnum.Enum.ModuleGroup;

export type ModuleGroupUserData = BuildModule & {
  type: typeof UserDataTypeEnum.Enum.ModuleGroup;
  gridGroupIndex: number;
  z: number;
  flip: boolean;
};

export class ModuleGroup extends Group {
  userData: ModuleGroupUserData;
  evaluator: Evaluator;

  constructor(userData: ModuleGroupUserData) {
    super();
    this.userData = userData;
    this.evaluator = new Evaluator();
  }

  createLevelCutBrushes(clippingBrush: Brush) {
    this.destroyClippedBrushes();

    clippingBrush.scale.setZ(this.scale.z);
    clippingBrush.position.setZ(this.position.z);
    clippingBrush.updateMatrixWorld();

    // const zInvertedMatrix = new Matrix4().makeTranslation(
    //   0,
    //   0,
    //   -this.position.z
    // );

    const inverseMatrix = this.matrix.invert();

    this.traverse((node) => {
      if (isElementBrush(node)) {
        const clippedBrush = new ClippedBrush();
        node.parent?.add(clippedBrush);

        node.updateMatrixWorld();
        this.evaluator.evaluate(node, clippingBrush, SUBTRACTION, clippedBrush);

        clippedBrush.geometry.applyMatrix4(inverseMatrix);

        clippedBrush.visible = false;
        clippedBrush.updateMatrixWorld();
      }
    });
  }

  showClippedBrushes() {
    this.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = false;
      } else if (isClippedBrush(node)) {
        node.visible = true;
      }
    });
  }

  destroyClippedBrushes() {
    this.traverse((node) => {
      if (!isClippedBrush(node)) return;
      node.removeFromParent();
    });
  }

  showElementBrushes() {
    this.traverse((node) => {
      if (isElementBrush(node)) {
        node.visible = true;
      } else if (isClippedBrush(node)) {
        node.visible = false;
      }
    });
  }
}

const createModuleGroup = ({
  gridGroupIndex,
  buildModule,
  z,
  getIfcGeometries,
  getBuildElement,
  getInitialThreeMaterial,
}: DefaultGetters & {
  gridGroupIndex: number;
  buildModule: BuildModule;
  z: number;
}): T.Task<ModuleGroup> => {
  const {
    systemId,
    speckleBranchUrl,
    structuredDna: { positionType },
    length: moduleLength,
  } = buildModule;

  const flip = gridGroupIndex !== 0 && positionType === "END";

  const moduleGroupUserData: ModuleGroupUserData = {
    ...buildModule,
    type: UserDataTypeEnum.Enum.ModuleGroup,
    gridGroupIndex,
    z,
    flip,
  };

  const moduleGroup = new ModuleGroup(moduleGroupUserData);

  moduleGroup.userData = moduleGroupUserData;

  moduleGroup.scale.setZ(flip ? 1 : -1);
  moduleGroup.position.setZ(flip ? z + moduleLength / 2 : z - moduleLength / 2);

  const elementGroupTask = pipe(
    getIfcGeometries(speckleBranchUrl),
    T.chain((modelGeometries) =>
      pipe(
        Object.entries(modelGeometries),
        A.traverse(T.ApplicativeSeq)(([ifcTag, geometry]) =>
          pipe(
            sequenceT(T.ApplicativePar)(
              getBuildElement({ systemId, ifcTag }),
              getInitialThreeMaterial({ systemId, ifcTag })
            ),
            T.map(([element, material]) =>
              createElementGroup({
                systemId,
                ifcTag,
                geometry,
                material,
                element,
              })
            )
          )
        )
      )
    )
  );

  return pipe(
    elementGroupTask,
    T.map((elementGroups) => {
      moduleGroup.add(...elementGroups);
      return moduleGroup;
    })
  );
};

export default createModuleGroup;
