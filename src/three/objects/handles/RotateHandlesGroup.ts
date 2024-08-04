import { PI } from "@/utils/math";
import HandleGroup from "./HandleGroup";
import RotateHandleMesh from "./RotateHandleMesh";
import { CircleGeometry, PlaneGeometry } from "three";
import handleMaterial from "./handleMaterial";
import { HouseGroup } from "../house/HouseGroup";
import { O } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";

const rotateHandleCircleGeometry = new CircleGeometry(0.5, 16);
const ROTATE_HANDLE_OFFSET = 5;
const ROTATE_HANDLE_SIZE = 0.3;

class RotateHandlesGroup extends HandleGroup {
  circleMesh1: RotateHandleMesh;
  circleMesh2: RotateHandleMesh;
  planeMesh1: RotateHandleMesh;
  planeMesh2: RotateHandleMesh;

  constructor(houseGroup: HouseGroup) {
    super();

    houseGroup.add(this);

    const { circleMesh1, circleMesh2 } = this.createCircleMeshes();
    this.circleMesh1 = circleMesh1;
    this.circleMesh2 = circleMesh2;

    const { planeMesh1, planeMesh2 } = this.createPlaneMeshes();
    this.planeMesh1 = planeMesh1;
    this.planeMesh2 = planeMesh2;

    this.add(circleMesh1, circleMesh2, planeMesh1, planeMesh2);
  }

  createCircleMeshes() {
    const circleMesh1 = new RotateHandleMesh(
      rotateHandleCircleGeometry,
      handleMaterial
    );
    circleMesh1.position.set(0, 0, -ROTATE_HANDLE_OFFSET);
    circleMesh1.rotation.x = -PI / 2;
    const circleMesh2 = new RotateHandleMesh(
      rotateHandleCircleGeometry,
      handleMaterial
    );
    circleMesh2.rotation.x = -PI / 2;

    return { circleMesh1, circleMesh2 };
  }

  createPlaneMeshes() {
    const planeMesh1 = new RotateHandleMesh(
      new PlaneGeometry(ROTATE_HANDLE_SIZE, ROTATE_HANDLE_OFFSET),
      handleMaterial
    );
    planeMesh1.rotation.x = -PI / 2;
    planeMesh1.position.set(0, 0, -ROTATE_HANDLE_OFFSET / 2);
    planeMesh1.name = "planeMesh1";

    const planeMesh2 = new RotateHandleMesh(
      new PlaneGeometry(ROTATE_HANDLE_OFFSET, ROTATE_HANDLE_SIZE),
      handleMaterial
    );
    planeMesh2.rotation.x = -PI / 2;
    planeMesh2.name = "planeMesh2";

    return { planeMesh1, planeMesh2 };
  }

  get houseGroup(): HouseGroup {
    if (this.parent instanceof HouseGroup) {
      return this.parent;
    } else {
      throw new Error(`get houseGroup failed`);
    }
  }

  syncDimensions() {
    pipe(
      this.houseGroup.activeLayoutGroup,
      O.map((activeLayoutGroup) => {
        const { width, depth } = activeLayoutGroup.userData;
        this.planeMesh2.position.set(-width / 1.05, 0, depth / 2);
        this.circleMesh2.position.set(
          -ROTATE_HANDLE_OFFSET - width / 4,
          0,
          depth / 2
        );
      })
    );
  }
}

export default RotateHandlesGroup;
