import outputsCache from "@/data/outputs/cache";
import { Group, Matrix4, Mesh, Object3D, ObjectLoader } from "three";
import { GLTFExporter, OBJExporter } from "three-stdlib";
import userCache from "@/data/user/cache";

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

const deleteRedundantModels = async () => {
  // Get all existing house IDs from the user cache
  const existingHouseIds = (await userCache.houses.toArray()).map(
    (x) => x.houseId
  );

  // Get all model keys
  const modelKeys = (await outputsCache.houseModels.toArray()).map(
    (x) => x.houseId
  );

  // Delete models that don't have a corresponding house
  for (const modelKey of modelKeys) {
    if (!existingHouseIds.includes(modelKey)) {
      await deleteModels({ houseId: modelKey });
    }
  }
};

const ExportersWorkerUtils = {
  upsertModels,
  deleteModels,
  deleteRedundantModels,
};

export default ExportersWorkerUtils;
