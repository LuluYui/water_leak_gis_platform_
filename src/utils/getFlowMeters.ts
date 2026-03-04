import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";

export interface FlowMeterData {
  localId: number;
  modelId: string;
  position: THREE.Vector3;
  name?: string;
  flowRate?: number;
  flowPressure?: number;
}

const FLOW_MARKER_COLOR = "#4a90d9";
const FLOW_LINE_COLOR = "#4a90d9";

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
    console.log("No flow meters found in model");
    return flowMeters;
  }

  console.log("Flow meters found:", result);

  for (const [modelId, localIds] of Object.entries(result)) {
    const model = fragments.list.get(modelId);
    if (!model) {
      console.warn(`Model not found: ${modelId}`);
      continue;
    }

    const localIdArray = [...localIds];
    console.log(`Model ${modelId}: Found ${localIdArray.length} flow meters`);

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

  console.log("Flow meters with coordinates:", flowMeters);

  return flowMeters;
};

export const createFlowMeterMarkers = async (
  components: OBC.Components,
  world: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBF.PostproductionRenderer
  >,
): Promise<void> => {
  const marker = components.get(OBF.Marker);
  marker.threshold = 10;

  const flowMeters = await getFlowMetersCoordinates(components);

  for (const flowMeter of flowMeters) {
    const element = BUI.Component.create(() => {
      return BUI.html`
        <div style="
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: sans-serif;
          font-size: 12px;
          min-width: 120px;
          border: 1px solid ${FLOW_MARKER_COLOR};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <div style="font-weight: bold; margin-bottom: 4px; color: ${FLOW_MARKER_COLOR};">
            ${flowMeter.name}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Flow Rate:</span>
            <span style="color: #4ade80; font-weight: bold;">
              ${flowMeter.flowRate?.toFixed(1)} L/min
            </span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Pressure:</span>
            <span style="color: #f87171; font-weight: bold;">
              ${flowMeter.flowPressure?.toFixed(2)} bar
            </span>
          </div>
        </div>
      `;
    });

    const offset = new THREE.Vector3(0, 0, 0);
    const markerPosition = flowMeter.position.clone().add(offset);

    marker.create(world, element, markerPosition);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      flowMeter.position,
      markerPosition,
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: FLOW_LINE_COLOR,
      linewidth: 2,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    world.scene.three.add(line);
  }

  console.log(`Created ${flowMeters.length} flow meter markers`);
};
