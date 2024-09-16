import {
  BuildElement,
  BuildModule,
  CachedBuildMaterial,
  cachedElementsTE,
  cachedMaterialsTE,
  getCachedModelTE,
} from "@/data/build-systems";
import { getThreeMaterial } from "@/three/materials/getThreeMaterial";
import { ThreeMaterial } from "@/three/materials/types";
import { A, E, O, TE } from "@/utils/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { flow, pipe } from "fp-ts/lib/function";
import { Group, Object3D } from "three";
import { ColumnLayoutGroup } from "./ColumnLayoutGroup";
import { defaultElementGroupCreator } from "./ElementGroup";
import { HouseGroup } from "./HouseGroup";
import { RowGroup } from "./RowGroup";
import { ElementBrush, ElementGroup } from "./ElementGroup";

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
  private elementBrushes: ElementBrush[] = [];

  constructor(userData: ModuleGroupUserData) {
    super();
    this.userData = userData;
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

  updateElementBrushes() {
    this.elementBrushes = [];
    this.traverse((object) => {
      if (object instanceof ElementGroup) {
        pipe(
          object.getVisibleBrush(),
          O.map((brush) => {
            this.elementBrushes.push(brush);
          })
        );
      }
    });
  }

  getElementBrushes(): ElementBrush[] {
    return this.elementBrushes;
  }
}

type MaterialGetters = {
  getElement: (
    systemId: string,
    ifcTag: string
  ) => E.Either<Error, BuildElement>;
  getMaterial: (
    systemId: string,
    specification: string
  ) => E.Either<Error, CachedBuildMaterial>;
  getInitialThreeMaterial: (
    systemId: string,
    ifcTag: string
  ) => E.Either<Error, ThreeMaterial>;
};

const defaultMaterialGettersTE: TE.TaskEither<Error, MaterialGetters> = pipe(
  sequenceT(TE.ApplicativePar)(cachedElementsTE, cachedMaterialsTE),
  TE.map(([elements, materials]): MaterialGetters => {
    const getElement = (systemId: string, ifcTag: string) =>
      pipe(
        elements,
        A.findFirst((x) => x.systemId === systemId && x.ifcTag === ifcTag),
        E.fromOption(() =>
          Error(`no element for ${ifcTag} found in ${systemId}`)
        )
      );

    const getMaterial = (systemId: string, specification: string) =>
      pipe(
        materials,
        A.findFirst(
          (m) => m.systemId === systemId && m.specification === specification
        ),
        E.fromOption(() =>
          Error(`no material for ${specification} in ${systemId}`)
        )
      );

    const getInitialThreeMaterial = flow(
      getElement,
      E.chain(({ systemId, defaultMaterial: specification }) =>
        pipe(
          getMaterial(systemId, specification),
          (x) => x,
          E.map((x) => getThreeMaterial(x))
        )
      )
    );

    return {
      getElement,
      getMaterial,
      getInitialThreeMaterial,
    };
  })
);

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
