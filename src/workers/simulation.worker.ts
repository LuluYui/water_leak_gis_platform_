import { SIMULATION_CONFIG } from "../config/appConfig";
import type { LiveFlowMeter, HistoricalDataPoint } from "../types";

interface LeakData {
  isActive: boolean;
  leakRate: number;
  pressureDrop: number;
}

interface WorkerMessage {
  type: "update";
  meters: LiveFlowMeter[];
  leaks: Map<string, LeakData[]>;
  maxHistoryPoints: number;
  historicalData: Map<string, HistoricalDataPoint[]>;
}

function calculateDiurnalFactor(hour: number): number {
  const { diurnal } = SIMULATION_CONFIG;
  if (hour >= diurnal.nightMin && hour <= diurnal.nightMax) return 0.2;
  if (hour >= diurnal.morningStart && hour <= diurnal.morningEnd)
    return diurnal.morningFactor;
  if (hour >= diurnal.peakStart && hour <= diurnal.peakEnd)
    return diurnal.peakFactor;
  if (hour >= diurnal.afternoonStart && hour <= diurnal.afternoonEnd)
    return diurnal.afternoonFactor;
  if (hour >= diurnal.eveningStart && hour <= diurnal.eveningEnd)
    return diurnal.eveningFactor;
  if (hour >= diurnal.nightStart || hour < diurnal.nightMin)
    return diurnal.nightFactor;
  return 1;
}

function updateMeterData(
  meter: LiveFlowMeter,
  leaks: LeakData[],
  maxHistoryPoints: number,
  historicalData: Map<string, HistoricalDataPoint[]>,
): void {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const diurnalFactor = calculateDiurnalFactor(hour);

  let totalLeakFlow = 0;
  let totalPressureDrop = 0;

  for (const leak of leaks) {
    if (leak.isActive) {
      const { leak: leakCfg } = SIMULATION_CONFIG;
      totalLeakFlow +=
        leak.leakRate *
        (leakCfg.flowVariationMin +
          Math.random() *
            (leakCfg.flowVariationMax - leakCfg.flowVariationMin));
      totalPressureDrop += leak.pressureDrop;
    }
  }

  const baseTarget = meter.baseFlowRate || 50;
  const targetFlow = baseTarget * diurnalFactor + totalLeakFlow;

  const { smoothing } = SIMULATION_CONFIG;
  const flowChange =
    (targetFlow - meter.flowRate) * smoothing.flowChangeFactor +
    (Math.random() - 0.5) * smoothing.flowNoiseRange;
  meter.flowRate = Math.max(0, meter.flowRate + flowChange);

  const flowPressureEffect = (meter.flowRate / 200) * 0.5;
  const targetPressure =
    SIMULATION_CONFIG.flowRate.targetPressure -
    flowPressureEffect -
    totalPressureDrop;
  const pressureChange =
    (targetPressure - meter.flowPressure) * smoothing.pressureChangeFactor +
    (Math.random() - 0.5) * smoothing.pressureNoiseRange;
  meter.flowPressure = Math.max(0, meter.flowPressure + pressureChange);

  meter.timestamp = now;

  if (!historicalData.has(meter.id)) historicalData.set(meter.id, []);
  const history = historicalData.get(meter.id)!;
  history.push({
    timestamp: meter.timestamp.getTime(),
    flowRate: meter.flowRate,
    flowPressure: meter.flowPressure,
  });
  if (history.length > maxHistoryPoints) history.shift();
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { meters, leaks, maxHistoryPoints, historicalData } = e.data;

  const updatedMeters: LiveFlowMeter[] = [];

  for (const meter of meters) {
    const meterLeaks = leaks.get(meter.id) || [];
    updateMeterData(meter, meterLeaks, maxHistoryPoints, historicalData);
    updatedMeters.push(meter);
  }

  self.postMessage({
    type: "updated",
    meters: updatedMeters,
    historicalData,
  });
};
