import { LiveFlowMeter, HistoricalDataPoint } from "../../types";
import { SIMULATION_CONFIG } from "../../config/appConfig";

export class SimulationController {
  private updateIntervalMs: number = SIMULATION_CONFIG.defaultIntervalMs;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;
  private onUpdateCallback:
    | ((
        meters: LiveFlowMeter[],
        historicalData: Map<string, HistoricalDataPoint[]>,
      ) => void)
    | null = null;
  private worker: Worker | null = null;
  private pendingUpdate: boolean = false;
  private meters: LiveFlowMeter[] = [];
  private leaks: Map<
    string,
    { isActive: boolean; leakRate: number; pressureDrop: number }[]
  > = new Map();
  private maxHistoryPoints: number = SIMULATION_CONFIG.maxHistoryPoints;
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL("../../workers/simulation.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = (e) => {
        const { meters, historicalData } = e.data;
        if (this.onUpdateCallback) {
          this.onUpdateCallback(meters, historicalData);
        }
        this.pendingUpdate = false;
      };
    } catch (error) {
      console.warn(
        "[SimulationController] Worker init failed, using main thread:",
        error,
      );
      this.worker = null;
    }
  }

  setUpdateInterval(ms: number): void {
    this.updateIntervalMs = ms;
    if (this.running) {
      this.stop();
      this.start(this.onUpdateCallback!);
    }
  }

  getUpdateInterval(): number {
    return this.updateIntervalMs;
  }

  setMeterData(
    meters: LiveFlowMeter[],
    leaks: Map<
      string,
      { isActive: boolean; leakRate: number; pressureDrop: number }[]
    >,
    maxHistoryPoints: number,
    historicalData: Map<string, HistoricalDataPoint[]>,
  ): void {
    this.meters = meters;
    this.leaks = leaks;
    this.maxHistoryPoints = maxHistoryPoints;
    this.historicalData = historicalData;
  }

  start(
    updateCallback: (
      meters: LiveFlowMeter[],
      historicalData: Map<string, HistoricalDataPoint[]>,
    ) => void,
  ): void {
    if (this.running) return;
    this.running = true;
    this.onUpdateCallback = updateCallback;
    this.intervalId = setInterval(() => {
      this.runSimulation();
    }, this.updateIntervalMs);
    this.runSimulation();
  }

  private runSimulation(): void {
    if (this.pendingUpdate) return;
    this.pendingUpdate = true;

    if (this.worker) {
      this.worker.postMessage({
        type: "update",
        meters: this.meters,
        leaks: this.leaks,
        maxHistoryPoints: this.maxHistoryPoints,
        historicalData: this.historicalData,
      });
    } else {
      this.runOnMainThread();
    }
  }

  private runOnMainThread(): void {
    for (const meter of this.meters) {
      const leaks = this.leaks.get(meter.id) || [];
      this.updateMeterDataOnMainThread(meter, leaks);
    }
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.meters, this.historicalData);
    }
    this.pendingUpdate = false;
  }

  private updateMeterDataOnMainThread(
    meter: LiveFlowMeter,
    leaks: { isActive: boolean; leakRate: number; pressureDrop: number }[],
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

    if (!this.historicalData.has(meter.id))
      this.historicalData.set(meter.id, []);
    const history = this.historicalData.get(meter.id)!;
    history.push({
      timestamp: meter.timestamp.getTime(),
      flowRate: meter.flowRate,
      flowPressure: meter.flowPressure,
    });
    if (history.length > this.maxHistoryPoints) history.shift();
  }

  private calculateDiurnalFactor(hour: number): number {
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

  calculateDiurnalFactorPublic(hour: number): number {
    return this.calculateDiurnalFactor(hour);
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
  ): void {
    this.updateMeterDataOnMainThread(meter, leaks);
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
