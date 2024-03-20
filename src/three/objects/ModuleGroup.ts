import { BuildModule } from "@/systemsData/modules";
import { DefaultGetters } from "@/tasks/defaultory";
import { A, T } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import { Group, Object3D } from "three";
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
};

export class ModuleGroup extends Group {
  userData: ModuleGroupUserData;
  evaluator: Evaluator;

  constructor(userData: ModuleGroupUserData) {
    super();
    this.userData = userData;
    this.evaluator = new Evaluator();
  }

  // createLevelCutBrushes(clippingBrush: Brush) {
  //   this.destroyClippedBrushes();

  //   this.traverse((node) => {
  //     if (isElementBrush(node)) {
  //       const clippedBrush = new ClippedBrush();
  //       node.parent?.add(clippedBrush);

  //       node.updateMatrixWorld();
  //       this.evaluator.evaluate(node, clippingBrush, SUBTRACTION, clippedBrush);

  //       clippedBrush.visible = false;
  //       clippedBrush.updateMatrixWorld();
  //     }
  //   });
  // }

  createLevelCutBrushes(clippingBrush: Brush) {
    this.destroyClippedBrushes();

    this.traverse((node) => {
      if (isElementBrush(node)) {
        const originalGeometry = node.geometry;
        originalGeometry.computeBoundingBox();
        console.log("Original Bounding Box:", originalGeometry.boundingBox);

        // Sample some vertices from the original geometry
        const originalPositions = originalGeometry.attributes.position.array;
        console.log("Original Vertex Positions Sample:");
        for (let i = 0; i < Math.min(15, originalPositions.length); i += 3) {
          // Sample first 5 vertices
          console.log(
            `x=${originalPositions[i]}, y=${originalPositions[i + 1]}, z=${
              originalPositions[i + 2]
            }`
          );
        }

        const clippedBrush = new ClippedBrush();
        node.parent?.add(clippedBrush);

        node.updateMatrixWorld();

        // Perform the clipping operation
        this.evaluator.evaluate(node, clippingBrush, SUBTRACTION, clippedBrush);

        const clippedGeometry = clippedBrush.geometry;
        clippedGeometry.computeBoundingBox();
        console.log("Clipped Bounding Box:", clippedGeometry.boundingBox);

        // Sample some vertices from the clipped geometry
        const clippedPositions = clippedGeometry.attributes.position.array;
        console.log("Clipped Vertex Positions Sample:");
        for (let i = 0; i < Math.min(15, clippedPositions.length); i += 3) {
          // Sample first 5 vertices
          console.log(
            `x=${clippedPositions[i]}, y=${clippedPositions[i + 1]}, z=${
              clippedPositions[i + 2]
            }`
          );
        }

        clippedBrush.visible = false;
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
  const moduleGroupUserData: ModuleGroupUserData = {
    ...buildModule,
    type: UserDataTypeEnum.Enum.ModuleGroup,
    gridGroupIndex,
    z,
  };

  const {
    systemId,
    speckleBranchUrl,
    length,
    structuredDna: { positionType },
  } = buildModule;

  const moduleGroup = new ModuleGroup(moduleGroupUserData);

  const flip = gridGroupIndex !== 0 && positionType === "END";

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
