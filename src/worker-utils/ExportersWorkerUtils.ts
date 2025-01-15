import outputsCache from "@/data/outputs/cache";
import { Group, Matrix4, Mesh, Object3D, ObjectLoader } from "three";
import { GLTFExporter, OBJExporter } from "three-stdlib";

function flattenObject(root: Object3D): Group {
  const flatGroup = new Group();
  let processedCount = 0;
  let skippedCount = 0;

  const skipObject = (object: Object3D) =>
    !(object instanceof Mesh) || !object.visible;

  root.traverse((child: Object3D) => {
    if (!skipObject(child)) {
      const newChild = child.clone();

      child.updateMatrixWorld();

      const positionMatrix = new Matrix4().setPosition(child.position);
      const rotationMatrix = new Matrix4().makeRotationFromQuaternion(
        child.quaternion
      );

      const positionInverter = positionMatrix.clone().invert();
      const rotationInverter = rotationMatrix.clone().invert();

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
      processedCount++;
    } else {
      skippedCount++;
    }
  });

  return flatGroup;
}

const upsertModels = async ({
  houseId,
  objectJson,
}: {
  houseId: string;
  objectJson: any;
}) => {
  const loader = new ObjectLoader();
  const parsed = loader.parse(objectJson);
  parsed.updateMatrixWorld(true);

  const flattenedOBJ = flattenObject(parsed.clone());

  const objExporter = new OBJExporter();
  const objData = objExporter.parse(flattenedOBJ);

  const gltfExporter = new GLTFExporter() as any;

  try {
    const glbData = await new Promise((resolve, reject) => {
      gltfExporter.parse(flattenedOBJ, resolve, reject, {
        binary: true,
        onlyVisible: true,
      });
    });

    outputsCache.houseModels.put({ houseId, glbData, objData });
  } catch (error) {
    console.error("GLB export failed:", error);
    throw error;
  }
};

const deleteModels = async ({ houseId }: { houseId: string }) => {
  outputsCache.houseModels.delete(houseId);
};

const ExportersWorkerUtils = {
  upsertModels,
  deleteModels,
};

export default ExportersWorkerUtils;
