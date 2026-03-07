import { LiveFlowMeter, HistoricalDataPoint } from "../../types";
import { SIMULATION_CONFIG } from "../../config/appConfig";

export class SimulationController {
  private updateIntervalMs: number = SIMULATION_CONFIG.defaultIntervalMs;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;
  private onUpdateCallback: (() => void) | null = null;

  setUpdateInterval(ms: number): void {
    this.updateIntervalMs = ms;
  }

  getUpdateInterval(): number {
    return this.updateIntervalMs;
  }

  start(updateCallback: () => void): void {
    if (this.running) return;
    this.running = true;
    this.onUpdateCallback = updateCallback;
    this.intervalId = setInterval(() => {
      if (this.onUpdateCallback) {
        this.onUpdateCallback();
      }
    }, this.updateIntervalMs);
    updateCallback();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onUpdateCallback = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  calculateDiurnalFactor(hour: number): number {
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

  calculateBaseFlowRate(): number {
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour <= 22;
    const { flowRate: fr } = SIMULATION_CONFIG;
    return isDaytime
      ? fr.daytimeMin + Math.random() * (fr.daytimeMax - fr.daytimeMin)
      : fr.nightMin + Math.random() * (fr.nightMax - fr.nightMin);
  }

  calculateBasePressure(): number {
    const { flowRate: fr } = SIMULATION_CONFIG;
    return fr.basePressure + Math.random() * fr.basePressureVariation;
  }

  updateMeterData(
    meter: LiveFlowMeter,
    leaks: { isActive: boolean; leakRate: number; pressureDrop: number }[],
    maxHistoryPoints: number,
    historicalData: Map<string, HistoricalDataPoint[]>,
  ): void {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const diurnalFactor = this.calculateDiurnalFactor(hour);

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
}
