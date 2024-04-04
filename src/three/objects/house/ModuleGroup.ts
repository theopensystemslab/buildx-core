import { BuildModule } from "@/build-systems/remote/modules";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { Group, Object3D } from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { UserDataTypeEnum } from "../types";
import {
  ClippedElementBrush,
  createElementGroup,
  isClippedBrush,
  isElementBrush,
} from "./ElementGroup";

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

  createClippedBrushes(clippingBrush: Brush) {
    const inverseMatrix = this.matrixWorld.invert();

    this.traverse((node) => {
      if (isElementBrush(node)) {
        const clippedBrush = new ClippedElementBrush();
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

export const createModuleGroup = ({
  gridGroupIndex,
  buildModule,
  z,
  flip,
  getBuildModel,
  getBuildElement,
  getInitialThreeMaterial,
}: DefaultGetters & {
  gridGroupIndex: number;
  buildModule: BuildModule;
  z: number;
  flip: boolean;
}): TE.TaskEither<Error, ModuleGroup> => {
  const { systemId, speckleBranchUrl, length: moduleLength } = buildModule;

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

  const elementGroupTE = pipe(
    getBuildModel(speckleBranchUrl),
    TE.flatMap(({ geometries }) => {
      return pipe(
        Object.entries(geometries),
        A.traverse(TE.ApplicativeSeq)(([ifcTag, geometry]) =>
          pipe(
            sequenceT(TE.ApplicativePar)(
              getBuildElement({ systemId, ifcTag }),
              getInitialThreeMaterial({ systemId, ifcTag })
            ),
            TE.map(([element, material]) =>
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
      );
    })
  );

  return pipe(
    elementGroupTE,
    TE.map((elementGroups) => {
      moduleGroup.add(...elementGroups);
      return moduleGroup;
    })
  );
};
