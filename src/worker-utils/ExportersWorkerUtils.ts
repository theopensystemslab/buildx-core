import outputsCache from "@/data/outputs/cache";
import { FullElementBrush } from "@/three/objects/house/ElementGroup";
import { Group, Matrix4, Object3D, ObjectLoader } from "three";
import { GLTFExporter, OBJExporter } from "three-stdlib";

function flattenObject(root: Object3D): Group {
  const flatGroup = new Group();

  const positionMatrix = new Matrix4().setPosition(root.position);
  const rotationMatrix = new Matrix4().makeRotationFromQuaternion(
    root.quaternion
  );

  const positionInverter = positionMatrix.clone().invert();
  const rotationInverter = rotationMatrix.clone().invert();

  const skipObject = (object: Object3D): boolean =>
    !(object instanceof FullElementBrush) || !object.visible;

  root.traverse((child: Object3D) => {
    if (!skipObject(child)) {
      const newChild = child.clone();

      child.updateMatrixWorld();

      newChild.matrix.copy(child.matrixWorld);

      newChild.matrix.premultiply(positionInverter);
      newChild.matrix.premultiply(rotationInverter);

      newChild.matrix.decompose(
        newChild.position,
        newChild.quaternion,
        newChild.scale
      );

      newChild.matrix.identity();

      flatGroup.add(newChild);
    }
  });

  return flatGroup;
}

const updateModels = async ({
  houseId,
  objectJson,
}: {
  houseId: string;
  objectJson: any;
}) => {
  const loader = new ObjectLoader();

  const parsed1 = loader.parse(objectJson);

  parsed1.updateMatrixWorld(true);

  const parsed2 = parsed1.clone();

  const gltfExporter = new GLTFExporter() as any;

  const flattened1 = flattenObject(parsed1);

  gltfExporter.parse(
    flattened1,
    function (glbData: any) {
      const objExporter = new OBJExporter();
      const flattened2 = flattenObject(parsed2);

      const objData = objExporter.parse(flattened2);
      outputsCache.houseModels.put({ houseId, glbData, objData });
    },
    function (e: any) {
      console.error(e);
    },
    { binary: true, onlyVisible: true }
  );
};

// const getOBJ = (houseId: string) => {
//   return OBJMap.get(houseId)
// }

// const getGLB = (houseId: string) => {
//   return GLBMap.get(houseId)
// }

const ExportersWorkerUtils = {
  updateModels,
  // getOBJ,
  // getGLB,
};

export default ExportersWorkerUtils;
