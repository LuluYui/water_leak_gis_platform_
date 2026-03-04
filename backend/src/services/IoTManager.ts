type EventCallback = (...args: any[]) => void;

class SimpleEventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(...args);
      }
    }
  }

  removeListener(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

import {
  FlowMeterConfig,
  FlowMeterData,
  FlowMeterReading,
} from "../models/FlowMeter";
import {
  FlowMeterAnalytics,
  AnalyticsSummary,
  HistoricalDataPoint,
} from "../models/Analytics";
import { DataSimulator } from "./DataSimulator";
import { HistoricalStore } from "./HistoricalStore";
import { AnalyticsEngine } from "./AnalyticsEngine";

export class IoTManager extends SimpleEventEmitter {
  private simulator: DataSimulator;
  private historicalStore: HistoricalStore;
  private analyticsEngine: AnalyticsEngine;

  private flowMeterConfigs: FlowMeterConfig[] = [];
  private flowMetersData: Map<string, FlowMeterData> = new Map();

  private updateIntervalMs: number = 15 * 60 * 1000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  constructor(updateIntervalMs: number = 15 * 60 * 1000) {
    super();
    this.simulator = new DataSimulator();
    this.historicalStore = new HistoricalStore();
    this.analyticsEngine = new AnalyticsEngine(this.historicalStore);
    this.updateIntervalMs = updateIntervalMs;
  }

  initialize57FlowMeters(): void {
    this.flowMeterConfigs = this.simulator.generate57FlowMeters();

    for (const config of this.flowMeterConfigs) {
      const meterData = this.simulator.getMeterDataFromConfig(config);
      this.flowMetersData.set(config.id, meterData);
    }

    console.log(
      `[IoTManager] Initialized ${this.flowMeterConfigs.length} flow meters`,
    );
  }

  startSimulation(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.generateReadings();
    }, this.updateIntervalMs);

    console.log(
      `[IoTManager] Simulation started with interval: ${this.updateIntervalMs / 1000}s`,
    );

    this.generateReadings();
  }

  stopSimulation(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("[IoTManager] Simulation stopped");
  }

  setUpdateInterval(intervalMs: number): void {
    this.updateIntervalMs = intervalMs;

    if (this.isRunning) {
      this.stopSimulation();
      this.startSimulation();
    }

    console.log(
      `[IoTManager] Update interval changed to: ${intervalMs / 1000}s`,
    );
  }

  public generateReadings(): void {
    for (const config of this.flowMeterConfigs) {
      const reading = this.simulator.generateReading(config);

      const meterData = this.flowMetersData.get(config.id)!;
      meterData.flowRate = reading.flowRate;
      meterData.flowPressure = reading.flowPressure;
      meterData.temperature = reading.temperature;
      meterData.timestamp = new Date(reading.timestamp);
      meterData.lastUpdated = new Date();

      this.historicalStore.add(config.id, reading);

      this.emit("flowMeterUpdate", meterData);
    }

    this.emit("updateCycleComplete", this.getAllMetersData());
  }

  getFlowMeter(id: string): FlowMeterData | undefined {
    return this.flowMetersData.get(id);
  }

  getAllMetersData(): FlowMeterData[] {
    return Array.from(this.flowMetersData.values());
  }

  getFlowMeterConfigs(): FlowMeterConfig[] {
    return this.flowMeterConfigs;
  }

  getAnalytics(meterId: string, timeRangeMs: number): FlowMeterAnalytics {
    const config = this.flowMeterConfigs.find((c) => c.id === meterId);
    const name = config?.name || meterId;
    return this.analyticsEngine.calculate(meterId, name, timeRangeMs);
  }

  getAllAnalytics(timeRangeMs: number): FlowMeterAnalytics[] {
    return this.analyticsEngine.calculateAll(
      this.flowMeterConfigs,
      timeRangeMs,
    );
  }

  getAnalyticsSummary(timeRangeMs: number): AnalyticsSummary {
    const analytics = this.getAllAnalytics(timeRangeMs);
    return this.analyticsEngine.calculateSummary(
      this.getAllMetersData(),
      analytics,
    );
  }

  getHistoricalData(
    meterId: string,
    timeRangeMs: number,
  ): HistoricalDataPoint[] {
    return this.historicalStore.getRange(meterId, timeRangeMs);
  }

  exportCSV(meterId: string): string {
    return this.historicalStore.exportCSV(meterId);
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  getUpdateInterval(): number {
    return this.updateIntervalMs;
  }

  getMetersByPattern(
    pattern: "residential" | "commercial" | "industrial",
  ): FlowMeterData[] {
    return this.flowMeterConfigs
      .filter((c) => c.pattern === pattern)
      .map((c) => this.flowMetersData.get(c.id)!);
  }
}
