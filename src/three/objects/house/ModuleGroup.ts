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
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { setVisibilityDown } from "@/three/utils";

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
  lastClippingBrush?: Brush;

  constructor(userData: ModuleGroupUserData) {
    super();
    this.userData = userData;
    this.evaluator = new Evaluator();
  }

  get rowGroup(): RowGroup {
    if (this.parent instanceof RowGroup) {
      return this.parent;
    } else {
      throw new Error(`get rowGroup failed`);
    }
  }

  get houseGroup(): HouseGroup {
    return this.rowGroup.houseGroup;
  }

  get columnLayoutGroup(): ColumnLayoutGroup {
    return this.rowGroup.columnLayoutGroup;
  }

  createClippedBrushes(clippingBrush: Brush) {
    if (clippingBrush === this.lastClippingBrush) return;

    const inverseMatrix = this.matrixWorld.invert();

    this.traverse((node) => {
      if (node instanceof FullElementBrush) {
        const clippedBrush = new ClippedElementBrush();
        node.parent?.add(clippedBrush);

        node.updateMatrixWorld();
        this.evaluator.evaluate(node, clippingBrush, SUBTRACTION, clippedBrush);

        clippedBrush.geometry.applyMatrix4(inverseMatrix);

        setVisibilityDown(clippedBrush, false);
        clippedBrush.updateMatrixWorld();

        this.lastClippingBrush = clippingBrush;
      }
    });
  }

  showClippedBrushes() {
    this.traverse((node) => {
      if (node instanceof FullElementBrush) {
        setVisibilityDown(node, false);
      } else if (node instanceof ClippedElementBrush) {
        setVisibilityDown(node, true);
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
        setVisibilityDown(node, true);
      } else if (node instanceof ClippedElementBrush) {
        setVisibilityDown(node, false);
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
