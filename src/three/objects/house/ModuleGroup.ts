import {
  defaultMaterialGettersTE,
  getCachedModelTE,
} from "@/build-systems/cache";
import { BuildModule } from "@/build-systems/remote/modules";
import { A, E, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Group, Object3D } from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import {
  ClippedElementBrush,
  FullElementBrush,
  defaultElementGroupCreator,
} from "./ElementGroup";
import { HouseGroup } from "./HouseGroup";
import { RowGroup } from "./RowGroup";

export const isModuleGroup = (node: Object3D): node is ModuleGroup =>
  node instanceof ModuleGroup;

export type ModuleGroupUserData = {
  module: BuildModule;
  moduleIndex: number;
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

  get houseGroup(): HouseGroup {
    if (this.parent?.parent?.parent?.parent instanceof HouseGroup) {
      return this.parent.parent.parent.parent;
    } else {
      throw new Error(`get houseGroup failed`);
    }
  }

  get rowGroup(): RowGroup {
    if (this.parent instanceof RowGroup) {
      return this.parent;
    } else {
      throw new Error(`get rowGroup failed`);
    }
  }

  createClippedBrushes = (clippingBrush: Brush) => {
    const inverseMatrix = this.matrixWorld.invert();

    this.traverse((node) => {
      if (node instanceof FullElementBrush) {
        const clippedBrush = new ClippedElementBrush();
        node.parent?.add(clippedBrush);

        node.updateMatrixWorld();
        this.evaluator.evaluate(node, clippingBrush, SUBTRACTION, clippedBrush);

        clippedBrush.geometry.applyMatrix4(inverseMatrix);

        clippedBrush.visible = false;
        clippedBrush.updateMatrixWorld();
      }
    });
  };

  showClippedBrushes() {
    this.traverse((node) => {
      if (node instanceof FullElementBrush) {
        node.visible = false;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = true;
      }
    });
  }

  destroyClippedBrushes() {
    this.traverse((node) => {
      if (!(node instanceof ClippedElementBrush)) return;
      node.removeFromParent();
    });
  }

  showElementBrushes() {
    this.traverse((node) => {
      if (node instanceof FullElementBrush) {
        node.visible = true;
      } else if (node instanceof ClippedElementBrush) {
        node.visible = false;
      }
    });
  }
}

export const defaultModuleGroupCreator = ({
  moduleIndex,
  buildModule,
  z,
  flip,
  getBuildModelTE = getCachedModelTE,
  materialGettersTE = defaultMaterialGettersTE,
}: {
  moduleIndex: number;
  buildModule: BuildModule;
  z: number;
  flip: boolean;
  getBuildModelTE?: typeof getCachedModelTE;
  materialGettersTE?: typeof defaultMaterialGettersTE;
}): TE.TaskEither<Error, ModuleGroup> => {
  const { systemId, speckleBranchUrl, length: moduleLength } = buildModule;

  const moduleGroupUserData: ModuleGroupUserData = {
    module: buildModule,
    moduleIndex: moduleIndex,
    z,
    flip,
  };

  const moduleGroup = new ModuleGroup(moduleGroupUserData);

  moduleGroup.userData = moduleGroupUserData;

  moduleGroup.scale.setZ(flip ? 1 : -1);
  moduleGroup.position.setZ(flip ? z + moduleLength / 2 : z - moduleLength / 2);

  const elementGroupsTE = pipe(
    getBuildModelTE(speckleBranchUrl),
    TE.flatMap(({ geometries }) =>
      pipe(
        Object.entries(geometries),
        A.traverse(TE.ApplicativePar)(([ifcTag, geometry]) =>
          pipe(
            materialGettersTE,
            TE.flatMap(({ getElement, getInitialThreeMaterial }) =>
              pipe(
                getElement(systemId, ifcTag),
                E.chain((element) =>
                  pipe(
                    getInitialThreeMaterial(systemId, ifcTag),
                    E.map((threeMaterial) => ({ element, threeMaterial }))
                  )
                ),
                TE.fromEither,
                TE.map(({ element, threeMaterial }) =>
                  defaultElementGroupCreator({
                    geometry,
                    threeMaterial: threeMaterial,
                    element,
                  })
                )
              )
            )
          )
        )
      )
    )
  );

  return pipe(
    elementGroupsTE,
    TE.map((elementGroups) => {
      moduleGroup.add(...elementGroups);
      return moduleGroup;
    })
  );
};
