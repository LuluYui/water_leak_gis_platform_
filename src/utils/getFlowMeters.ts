import * as OBC from "@thatopen/components";
import * as THREE from "three";

export interface FlowMeterData {
  localId: number;
  modelId: string;
  position: THREE.Vector3;
  name?: string;
  flowRate?: number;
  flowPressure?: number;
}

export const getFlowMetersCoordinates = async (
  components: OBC.Components,
): Promise<FlowMeterData[]> => {
  const finder = components.get(OBC.ItemsFinder);
  const fragments = components.get(OBC.FragmentsManager);

  const flowMeters: FlowMeterData[] = [];

  const finderQuery = finder.list.get("FlowMeters");
  if (!finderQuery) {
    console.warn("FlowMeters query not found");
    return flowMeters;
  }

  const result = await finderQuery.test();
  if (!result || Object.keys(result).length === 0) {
    return flowMeters;
  }

  for (const [modelId, localIds] of Object.entries(result)) {
    const model = fragments.list.get(modelId);
    if (!model) {
      console.warn(`Model not found: ${modelId}`);
      continue;
    }

    const localIdArray = [...localIds];

    const boxes = await model.getBoxes(localIdArray);

    for (let i = 0; i < localIdArray.length; i++) {
      const localId = localIdArray[i];
      const box = boxes[i];

      const center = new THREE.Vector3();
      box.getCenter(center);

      const data = await model.getItemsData([localId]);
      const elementData = data[0] as any;

      const flowMeter: FlowMeterData = {
        localId,
        modelId,
        position: center,
        name: elementData?.Name?.value?.split(":")[0] || `FlowMeter_${localId}`,
        flowRate: elementData?.FlowRate?.value ?? Math.random() * 100 + 50,
        flowPressure:
          elementData?.FlowPressure?.value ||
          elementData?.Pressure?.value ||
          Math.random() * 5 + 1,
      };

      flowMeters.push(flowMeter);
    }
  }

  return flowMeters;
};
