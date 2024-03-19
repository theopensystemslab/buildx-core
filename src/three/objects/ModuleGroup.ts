import { BuildModule } from "@/systemsData/modules";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, T } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { BoxGeometry, Group, MeshBasicMaterial, Object3D } from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import createElementGroup, {
  isClippedBrush,
  isElementBrush,
} from "./ElementGroup";
import { UserDataTypeEnum } from "./types";

const clippingMaterial = new MeshBasicMaterial({ color: "white" });

export const isModuleGroup = (node: Object3D): node is ModuleGroup =>
  node.userData?.type === UserDataTypeEnum.Enum.ModuleGroup;

export type ModuleGroupUserData = BuildModule & {
  type: typeof UserDataTypeEnum.Enum.ModuleGroup;
  gridGroupIndex: number;
  z: number;
};

export class ModuleGroup extends Group {
  userData: ModuleGroupUserData;
  declare clippingBrush: Brush;
  evaluator: Evaluator;

  constructor(userData: ModuleGroupUserData) {
    super();
    this.userData = userData;
    this.evaluator = new Evaluator();
  }

  createLevelCutBrushes(cutHeight: number) {
    const { width, length } = this.userData;

    this.clippingBrush = new Brush(
      new BoxGeometry(width, cutHeight, length),
      clippingMaterial
    );

    this.destroyClippedBrushes();

    this.traverse((node) => {
      if (isElementBrush(node)) {
        const clippedBrush = this.evaluator.evaluate(
          node,
          this.clippingBrush,
          SUBTRACTION
        );
        clippedBrush.visible = false;
        node.parent?.add(clippedBrush);
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
    z,
  };

  const { systemId, speckleBranchUrl, length } = buildModule;

  const moduleGroup = new ModuleGroup(moduleGroupUserData);

  moduleGroup.userData = moduleGroupUserData;
  moduleGroup.scale.set(1, 1, flip ? 1 : -1);
  moduleGroup.position.set(0, 0, flip ? z + length / 2 : z - length / 2);

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
