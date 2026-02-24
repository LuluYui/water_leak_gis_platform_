# IoT Flow Meter Simulation & Analytics Dashboard

## Project Overview

This document outlines the complete architecture and implementation plan for building a real-time IoT flow meter simulation and analytics dashboard using vanilla TypeScript.

### Goals

- Simulate 57 electromagnetic flow meters with realistic data patterns
- Real-time visualization on 3D BIM viewer
- Historical data logging with analytics indicators
- Architecture flexible for future real IoT device integration

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Vanilla TS)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   3D Viewer  │  │  IoT Manager │  │ UI Controls  │  │ Chart Panel  │  │
│  │ (ThatOpen)   │  │ (WebSocket)  │  │  (Settings)  │  │  (Realtime)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                            │                │                │             │
│                            └────────────────┼────────────────┘             │
│                                             │                                │
│                                    ┌────────▼────────┐                     │
│                                    │  State Manager  │                     │
│                                    │ (EventEmitter)  │                     │
│                                    └────────┬────────┘                     │
└─────────────────────────────────────────────┼───────────────────────────────┘
                                              │
                                              │ WebSocket / HTTP
                                              │
┌─────────────────────────────────────────────┼───────────────────────────────┐
│                                    BACKEND                                   │
├─────────────────────────────────────────────┼───────────────────────────────┤
│                                             │                                │
│  ┌──────────────────┐     ┌─────────────────▼────────────┐                  │
│  │ IoT Simulator    │────▶│   WebSocket Server        │                  │
│  │ (57 Flow Meters) │     │   (Express + ws)           │◀── MQTT/TCP      │
│  └──────────────────┘     └───────────┬────────────────┘   (Future IoT)    │
│                                        │                                    │
│                                        ▼                                    │
│                              ┌──────────────────────┐                       │
│                              │  Time-Series Store   │                       │
│                              │  (In-memory/SQLite)  │                       │
│                              └──────────────────────┘                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Flow Meter Interface

```typescript
// src/iot/models/FlowMeter.ts

export interface FlowMeterData {
  id: string; // Unique identifier (e.g., "FM-001")
  localId: number; // IFC local ID
  modelId: string; // IFC model ID
  position: THREE.Vector3; // 3D position in viewer
  name: string; // Display name
  pipeSpec?: string; // Pipe specification (e.g., "DN100")

  // Real-time data
  flowRate: number; // L/min
  flowPressure: number; // bar
  temperature?: number; // °C (optional)
  timestamp: Date;

  // Status
  isOnline: boolean;
  lastUpdated: Date;
}

export interface FlowMeterReading {
  id: string;
  flowRate: number;
  flowPressure: number;
  timestamp: number;
}

export interface FlowMeterConfig {
  id: string;
  name: string;
  baseFlowRate: number; // Baseline flow rate (L/min)
  basePressure: number; // Baseline pressure (bar)
  varianceFlow: number; // Random variance for flow rate
  variancePressure: number; // Random variance for pressure
  pattern: FlowPattern; // Usage pattern type
  position: THREE.Vector3; // 3D position
}
```

### Analytics Indicators

```typescript
// src/iot/models/Analytics.ts

export interface AnalyticsIndicator {
  name: string;
  value: number;
  unit: string;
  calculatedAt: Date;
}

export interface HistoricalDataPoint {
  timestamp: number;
  flowRate: number;
  flowPressure: number;
}

export interface FlowMeterAnalytics {
  meterId: string;

  // Statistical indicators
  movingAverage: number; // Simple moving average
  exponentialMovingAverage: number; // EMA
  minimumNightLow: number; // Night baseline (12am-5am)
  maximumPeak: number; // Peak value in period
  average: number; // Period average

  // Trend indicators
  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number; // % change

  // Historical data
  history: HistoricalDataPoint[];
}
```

### IoT Data Source Interface (Future-Proof)

```typescript
// src/iot/adapters/IoTAdapter.ts

export type IoTDataFormat = "json" | "mqtt" | "tcp" | "websocket" | "unknown";

export interface IoTMessage {
  deviceId: string;
  timestamp: number;
  payload: Record<string, number | string>;
}

export interface IoTAdapter {
  readonly name: string;
  readonly supportedFormat: IoTDataFormat;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(callback: (message: IoTMessage) => void): void;
  onError(callback: (error: Error) => void): void;
}

export interface IoTAdapterFactory {
  createAdapter(config: IoTAdapterConfig): IoTAdapter;
}

export interface IoTAdapterConfig {
  type: IoTDataFormat;
  host?: string;
  port?: number;
  topic?: string;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
  };
}
```

---

## Directory Structure

```
src/
├── main.ts                              # Entry point
│
├── iot/                                 # IoT module
│   ├── index.ts                         # IoT module exports
│   │
│   ├── adapters/                        # IoT adapter implementations
│   │   ├── IoTAdapter.ts               # Base interface
│   │   ├── SimulatorAdapter.ts          # Data simulator
│   │   ├── WebSocketAdapter.ts          # WebSocket client
│   │   ├── MqttAdapter.ts               # MQTT (future)
│   │   └── index.ts                     # Adapter factory
│   │
│   ├── models/
│   │   ├── FlowMeter.ts                 # Flow meter data model
│   │   └── Analytics.ts                 # Analytics interfaces
│   │
│   ├── services/
│   │   ├── IoTManager.ts                # Main IoT service
│   │   ├── DataSimulator.ts             # Data generation
│   │   ├── HistoricalStore.ts           # In-memory time-series
│   │   └── AnalyticsEngine.ts           # Indicator calculations
│   │
│   └── utils/
│       ├── patterns.ts                  # Flow patterns
│       └── formatters.ts                # Data formatters
│
├── ui/                                  # UI components
│   ├── controls/
│   │   ├── IoTControlPanel.ts          # Settings panel
│   │   └── FlowMeterSelector.ts         # Meter filter
│   │
│   ├── charts/
│   │   ├── ChartPanel.ts                # Chart container
│   │   ├── LineChart.ts                 # Reusable line chart
│   │   └── ChartRenderer.ts             # Canvas chart renderer
│   │
│   └── markers/
│       └── FlowMeterMarker.ts           # 3D marker with data
│
└── utils/
    ├── EventEmitter.ts                  # Simple pub/sub
    └── constants.ts                     # Shared constants
```

---

## Core Services

### 1. IoT Manager Service

```typescript
// src/iot/services/IoTManager.ts

import { EventEmitter } from "../../utils/EventEmitter";
import { FlowMeter, FlowMeterReading, FlowMeterConfig } from "../models/FlowMeter";
import { IoTAdapter, IoTMessage, IoTAdapterConfig } from "../adapters/IoTAdapter";
import { DataSimulator } from "./DataSimulator";
import { HistoricalStore } from "./HistoricalStore";
import { AnalyticsEngine, FlowMeterAnalytics } from "./AnalyticsEngine";

export class IoTManager extends EventEmitter {
  private adapter: IoTAdapter | null = null;
  private simulator: DataSimulator;
  private historicalStore: HistoricalStore;
  private analyticsEngine: AnalyticsEngine;

  private flowMeters: Map<string, FlowMeter> = new Map();
  private updateInterval: number = 15 * 60 * 1000; // 15 minutes default
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  constructor(
    private components: OBC.Components,
    private world: OBC.SimpleWorld<...>
  ) {
    this.simulator = new DataSimulator();
    this.historicalStore = new HistoricalStore();
    this.analyticsEngine = new AnalyticsEngine(this.historicalStore);
  }

  // Initialize flow meters from IFC model
  async initializeFlowMeters(): Promise<void> {
    const finder = this.components.get(OBC.ItemsFinder);
    const finderQuery = finder.list.get("FlowMeters");
    if (!finderQuery) return;

    const result = await finderQuery.test();
    // ... parse flow meters and store in this.flowMeters
  }

  // Connect to IoT source (simulator or real)
  async connect(config: IoTAdapterConfig): Promise<void> {
    // Factory creates appropriate adapter
    this.adapter = createAdapter(config);
    this.adapter.onMessage(this.handleMessage.bind(this));
    await this.adapter.connect();
  }

  // Start simulation
  startSimulation(intervalMs?: number): void {
    if (intervalMs) this.updateInterval = intervalMs;
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      for (const [id, meter] of this.flowMeters) {
        const reading = this.simulator.generateReading(meter.config);
        this.updateFlowMeter(id, reading);
      }
    }, this.updateInterval);
  }

  // Stop simulation
  stopSimulation(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Update interval
  setUpdateInterval(intervalMs: number): void {
    this.updateInterval = intervalMs;
    if (this.isRunning) {
      this.stopSimulation();
      this.startSimulation();
    }
  }

  // Get analytics for a specific meter
  getAnalytics(meterId: string, timeRangeMs: number): FlowMeterAnalytics {
    return this.analyticsEngine.calculate(meterId, timeRangeMs);
  }

  // Get all analytics
  getAllAnalytics(timeRangeMs: number): FlowMeterAnalytics[] {
    const analytics: FlowMeterAnalytics[] = [];
    for (const id of this.flowMeters.keys()) {
      analytics.push(this.analyticsEngine.calculate(id, timeRangeMs));
    }
    return analytics;
  }

  private handleMessage(message: IoTMessage): void {
    // Normalize and update flow meter
    const meterId = message.deviceId;
    const reading: FlowMeterReading = {
      id: meterId,
      flowRate: message.payload.flowRate as number,
      flowPressure: message.payload.flowPressure as number,
      timestamp: message.timestamp
    };
    this.updateFlowMeter(meterId, reading);
  }

  private updateFlowMeter(id: string, reading: FlowMeterReading): void {
    const meter = this.flowMeters.get(id);
    if (!meter) return;

    meter.flowRate = reading.flowRate;
    meter.flowPressure = reading.flowPressure;
    meter.timestamp = new Date(reading.timestamp);
    meter.lastUpdated = new Date();

    // Store in historical data
    this.historicalStore.add(id, reading);

    // Emit update event
    this.emit("flowMeterUpdate", meter);
  }
}
```

### 2. Data Simulator

```typescript
// src/iot/services/DataSimulator.ts

import {
  FlowMeterConfig,
  FlowMeterReading,
  FlowPattern,
} from "../models/FlowMeter";
import {
  RESIDENTIAL_DAY_PATTERN,
  COMMERCIAL_DAY_PATTERN,
  INDUSTRIAL_DAY_PATTERN,
} from "../utils/patterns";

export class DataSimulator {
  private patterns: Map<FlowPattern, number[]> = new Map([
    ["residential", RESIDENTIAL_DAY_PATTERN],
    ["commercial", COMMERCIAL_DAY_PATTERN],
    ["industrial", INDUSTRIAL_DAY_PATTERN],
  ]);

  generateReading(config: FlowMeterConfig): FlowMeterReading {
    const now = new Date();
    const hour = now.getHours();

    // Get pattern multiplier for current hour
    const pattern =
      this.patterns.get(config.pattern) || RESIDENTIAL_DAY_PATTERN;
    const patternMultiplier = pattern[hour];

    // Calculate base values with pattern
    const baseFlow = config.baseFlowRate * patternMultiplier;
    const basePressure = config.basePressure;

    // Add realistic noise/variance
    const flowNoise = (Math.random() - 0.5) * config.varianceFlow;
    const pressureNoise = (Math.random() - 0.5) * config.variancePressure;

    // Occasional anomalies (spikes)
    const flowSpike = Math.random() > 0.98 ? Math.random() * 20 : 0;
    const pressureSpike = Math.random() > 0.98 ? Math.random() * 0.5 : 0;

    return {
      id: config.id,
      flowRate: Math.max(0, baseFlow + flowNoise + flowSpike),
      flowPressure: Math.max(0, basePressure + pressureNoise + pressureSpike),
      timestamp: now.getTime(),
    };
  }

  // Generate all 57 flow meters with different configurations
  generate57FlowMeters(): FlowMeterConfig[] {
    const meters: FlowMeterConfig[] = [];
    const patterns: FlowPattern[] = ["residential", "commercial", "industrial"];

    for (let i = 1; i <= 57; i++) {
      const id = `FM-${String(i).padStart(3, "0")}`;
      const pattern = patterns[i % 3];

      meters.push({
        id,
        name: `FlowMeter_${id}`,
        baseFlowRate: 50 + Math.random() * 150, // 50-200 L/min
        basePressure: 2 + Math.random() * 4, // 2-6 bar
        varianceFlow: 10 + Math.random() * 10, // 10-20 variance
        variancePressure: 0.2 + Math.random() * 0.3, // 0.2-0.5 variance
        pattern,
        position: new THREE.Vector3(0, 0, 0), // Will be set from IFC
      });
    }

    return meters;
  }
}
```

### 3. Analytics Engine

```typescript
// src/iot/services/AnalyticsEngine.ts

import {
  HistoricalDataPoint,
  FlowMeterAnalytics,
  AnalyticsIndicator,
} from "../models/Analytics";

export class AnalyticsEngine {
  constructor(private store: HistoricalStore) {}

  calculate(meterId: string, timeRangeMs: number): FlowMeterAnalytics {
    const history = this.store.getRange(meterId, timeRangeMs);

    if (history.length === 0) {
      return this.emptyAnalytics(meterId);
    }

    const flowRates = history.map((h) => h.flowRate);
    const pressures = history.map((h) => h.flowPressure);

    const movingAvg = this.movingAverage(flowRates, 10);
    const ema = this.exponentialMovingAverage(flowRates, 0.3);
    const minNightLow = this.minimumNightLow(history);
    const peak = Math.max(...flowRates);
    const avg = this.average(flowRates);

    const { trend, percentage } = this.calculateTrend(flowRates);

    return {
      meterId,
      movingAverage: movingAvg,
      exponentialMovingAverage: ema,
      minimumNightLow: minNightLow,
      maximumPeak: peak,
      average: avg,
      trend,
      trendPercentage: percentage,
      history,
    };
  }

  // Simple Moving Average
  private movingAverage(values: number[], period: number): number {
    if (values.length < period)
      return values.length > 0 ? this.average(values) : 0;
    const slice = values.slice(-period);
    return this.average(slice);
  }

  // Exponential Moving Average
  private exponentialMovingAverage(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  // Minimum Night Low (12am - 5am readings)
  private minimumNightLow(history: HistoricalDataPoint[]): number {
    const nightReadings = history.filter((p) => {
      const hour = new Date(p.timestamp).getHours();
      return hour >= 0 && hour <= 5;
    });

    if (nightReadings.length === 0) return 0;
    return Math.min(...nightReadings.map((r) => r.flowRate));
  }

  private average(values: number[]): number {
    return values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  private calculateTrend(values: number[]): {
    trend: "increasing" | "decreasing" | "stable";
    percentage: number;
  } {
    if (values.length < 10) return { trend: "stable", percentage: 0 };

    const recent = values.slice(-5);
    const previous = values.slice(-10, -5);

    const recentAvg = this.average(recent);
    const previousAvg = this.average(previous);

    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (changePercent > 5)
      return { trend: "increasing", percentage: changePercent };
    if (changePercent < -5)
      return { trend: "decreasing", percentage: changePercent };
    return { trend: "stable", percentage: changePercent };
  }

  private emptyAnalytics(meterId: string): FlowMeterAnalytics {
    return {
      meterId,
      movingAverage: 0,
      exponentialMovingAverage: 0,
      minimumNightLow: 0,
      maximumPeak: 0,
      average: 0,
      trend: "stable",
      trendPercentage: 0,
      history: [],
    };
  }
}
```

### 4. Historical Store

```typescript
// src/iot/services/HistoricalStore.ts

import { FlowMeterReading, HistoricalDataPoint } from "../models/Analytics";

export class HistoricalStore {
  private data: Map<string, HistoricalDataPoint[]> = new Map();
  private maxPointsPerMeter: number = 10000;

  add(meterId: string, reading: FlowMeterReading): void {
    const point: HistoricalDataPoint = {
      timestamp: reading.timestamp,
      flowRate: reading.flowRate,
      flowPressure: reading.flowPressure,
    };

    if (!this.data.has(meterId)) {
      this.data.set(meterId, []);
    }

    const meterData = this.data.get(meterId)!;
    meterData.push(point);

    // Keep only recent data (memory management)
    if (meterData.length > this.maxPointsPerMeter) {
      meterData.splice(0, meterData.length - this.maxPointsPerMeter);
    }
  }

  getRange(meterId: string, timeRangeMs: number): HistoricalDataPoint[] {
    const meterData = this.data.get(meterId) || [];
    const cutoff = Date.now() - timeRangeMs;

    return meterData.filter((p) => p.timestamp >= cutoff);
  }

  getAll(meterId: string): HistoricalDataPoint[] {
    return this.data.get(meterId) || [];
  }

  clear(): void {
    this.data.clear();
  }

  // Export for charting
  exportCSV(meterId: string): string {
    const data = this.data.get(meterId) || [];
    let csv = "timestamp,flowRate,flowPressure\n";

    for (const point of data) {
      csv += `${new Date(point.timestamp).toISOString()},${point.flowRate},${point.flowPressure}\n`;
    }

    return csv;
  }
}
```

---

## IoT Adapters (Future-Proof Design)

### Base Adapter Interface

```typescript
// src/iot/adapters/IoTAdapter.ts

export interface IoTAdapter {
  readonly name: string;
  readonly supportedFormat: IoTDataFormat;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(callback: (message: IoTMessage) => void): void;
  onError(callback: (error: Error) => void): void;
  onDisconnect(callback: () => void): void;
}
```

### Simulator Adapter

```typescript
// src/iot/adapters/SimulatorAdapter.ts

import { IoTAdapter, IoTMessage } from "./IoTAdapter";
import { DataSimulator } from "../services/DataSimulator";
import { FlowMeterConfig } from "../models/FlowMeter";

export class SimulatorAdapter implements IoTAdapter {
  readonly name = "SimulatorAdapter";
  readonly supportedFormat = "json";
  readonly isConnected: boolean = false;

  private simulator: DataSimulator;
  private meterConfigs: FlowMeterConfig[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private messageCallback?: (message: IoTMessage) => void;
  private errorCallback?: (error: Error) => void;
  private updateInterval: number = 15000;

  constructor(configs: FlowMeterConfig[], updateIntervalMs: number = 15000) {
    this.simulator = new DataSimulator();
    this.meterConfigs = configs;
    this.updateInterval = updateIntervalMs;
  }

  async connect(): Promise<void> {
    this.startSimulation();
  }

  async disconnect(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onMessage(callback: (message: IoTMessage) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    // Handle disconnect
  }

  private startSimulation(): void {
    this.intervalId = setInterval(() => {
      for (const config of this.meterConfigs) {
        const reading = this.simulator.generateReading(config);

        const message: IoTMessage = {
          deviceId: config.id,
          timestamp: Date.now(),
          payload: {
            flowRate: reading.flowRate,
            flowPressure: reading.flowPressure,
          },
        };

        this.messageCallback?.(message);
      }
    }, this.updateInterval);
  }

  setInterval(intervalMs: number): void {
    this.updateInterval = intervalMs;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}
```

### WebSocket Adapter (for real IoT backend)

```typescript
// src/iot/adapters/WebSocketAdapter.ts

import { IoTAdapter, IoTMessage } from "./IoTAdapter";

export class WebSocketAdapter implements IoTAdapter {
  readonly name = "WebSocketAdapter";
  readonly supportedFormat: IoTDataFormat = "websocket";
  readonly isConnected: boolean = false;

  private ws: WebSocket | null = null;
  private messageCallback?: (message: IoTMessage) => void;
  private errorCallback?: (error: Error) => void;
  private disconnectCallback?: () => void;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Normalize to IoTMessage format
            const message: IoTMessage = {
              deviceId: data.deviceId || data.id || data.meterId,
              timestamp: data.timestamp || Date.now(),
              payload: data.payload || data,
            };
            this.messageCallback?.(message);
          } catch (e) {
            this.errorCallback?.(new Error("Failed to parse message"));
          }
        };

        this.ws.onerror = (event) => {
          this.errorCallback?.(new Error("WebSocket error"));
        };

        this.ws.onclose = () => {
          this.disconnectCallback?.();
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    this.ws?.close();
    this.ws = null;
  }

  onMessage(callback: (message: IoTMessage) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }
}
```

### MQTT Adapter (Future - for real IoT devices)

```typescript
// src/iot/adapters/MqttAdapter.ts

// Placeholder for future MQTT integration
// Would use 'mqtt' npm package
// import * as mqtt from 'mqtt';

export class MqttAdapter implements IoTAdapter {
  readonly name = "MqttAdapter";
  readonly supportedFormat: IoTDataFormat = "mqtt";
  readonly isConnected: boolean = false;

  // Future implementation
  async connect(): Promise<void> {
    throw new Error("MQTT adapter not yet implemented");
  }

  async disconnect(): Promise<void> {}
  onMessage(callback: (message: IoTMessage) => void): void {}
  onError(callback: (error: Error) => void): void {}
  onDisconnect(callback: () => void): void {}
}
```

### Adapter Factory

```typescript
// src/iot/adapters/index.ts

import { IoTAdapter, IoTAdapterConfig, IoTDataFormat } from "./IoTAdapter";
import { SimulatorAdapter } from "./SimulatorAdapter";
import { WebSocketAdapter } from "./WebSocketAdapter";
import { MqttAdapter } from "./MqttAdapter";

export function createAdapter(config: IoTAdapterConfig): IoTAdapter {
  switch (config.type) {
    case "json":
      // Simulator with JSON format
      return new SimulatorAdapter([], config.port || 15000);

    case "websocket":
      if (!config.host) throw new Error("WebSocket host required");
      return new WebSocketAdapter(`ws://${config.host}:${config.port || 8080}`);

    case "mqtt":
      return new MqttAdapter();

    default:
      throw new Error(`Unsupported IoT adapter type: ${config.type}`);
  }
}

export { IoTAdapter, IoTAdapterConfig, IoTDataFormat } from "./IoTAdapter";
export { SimulatorAdapter } from "./SimulatorAdapter";
export { WebSocketAdapter } from "./WebSocketAdapter";
export { MqttAdapter } from "./MqttAdapter";
```

---

## UI Components

### IoT Control Panel

```typescript
// src/ui/controls/IoTControlPanel.ts

import * as BUI from "@thatopen/ui";

export interface IoTControlPanelState {
  iotManager: IoTManager;
  flowMeters: FlowMeter[];
}

export const createIoTControlPanel: BUI.StatefullComponent<
  IoTControlPanelState
> = (state) => {
  const { iotManager, flowMeters } = state;

  let currentInterval = 15; // minutes

  const handleIntervalChange = (event: Event) => {
    const target = event.target as BUI.NumberInput;
    currentInterval = target.value;
    iotManager.setUpdateInterval(currentInterval * 60 * 1000);
  };

  const handleStart = () => {
    iotManager.startSimulation();
  };

  const handleStop = () => {
    iotManager.stopSimulation();
  };

  const handleExportCSV = (meterId: string) => {
    const csv = iotManager.historicalStore.exportCSV(meterId);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowmeter_${meterId}.csv`;
    a.click();
  };

  return BUI.html`
    <bim-panel-section icon="📡" label="IoT Controls">
      <bim-number-input 
        label="Update Interval (min)" 
        .value=${currentInterval}
        min="1" 
        max="60"
        @change=${handleIntervalChange}
      ></bim-number-input>
      
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <bim-button label="Start" @click=${handleStart}></bim-button>
        <bim-button label="Stop" @click=${handleStop}></bim-button>
      </div>
      
      <bim-panel-section label="Flow Meters (${flowMeters.length})">
        <div style="max-height: 200px; overflow-y: auto;">
          ${flowMeters.map(
            (meter) => BUI.html`
            <bim-button 
              label="${meter.name}: ${meter.flowRate.toFixed(1)} L/min"
              @click=${() => handleExportCSV(meter.id)}
            ></bim-button>
          `,
          )}
        </div>
      </bim-panel-section>
    </bim-panel-section>
  `;
};
```

### Chart Panel

```typescript
// src/ui/charts/ChartPanel.ts

import * as BUI from "@thatopen/ui";
import { FlowMeterAnalytics } from "../../iot/models/Analytics";

export interface ChartPanelState {
  analytics: FlowMeterAnalytics[];
  selectedMeterId: string | null;
}

export const createChartPanel: BUI.StatefullComponent<ChartPanelState> = (state) => {
  const { analytics, selectedMeterId } = state;

  const selectedAnalytics = selectedMeterId
    ? analytics.find(a => a.meterId === selectedMeterId)
    : null;

  return BUI.html`
    <bim-panel-section icon="📊" label="Analytics">
      <bim-select label="Select Flow Meter">
        <bim-option
          label="All Meters"
          value=""
        ></bim-option>
        ${analytics.map(a => BUI.html`
          <bim-option
            label="${a.meterId}"
            value="${a.meterId}"
          ></bim-option>
        `)}
      </bim-select>

      ${selectedAnalytics ? BUI.html`
        <div style="padding: 12px; background: rgba(0,0,0,0.3); border-radius: 4px;">
          <div style="margin-bottom: 8px;">
            <span style="color: #888;">Moving Average:</span>
            <span style="color: #4ade80; font-weight: bold;">
              ${selectedAnalytics.movingAverage.toFixed(1)} L/min
            </span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #888;">EMA:</span>
            <span style="color: #60a5fa; font-weight: bold;">
              ${selectedAnalytics.exponentialMovingAverage.toFixed(1)} L/min
            </span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #888;">Min Night Low:</span>
            <span style="color: #f472b6; font-weight: bold;">
              ${selectedAnalytics.minimumNightLow.toFixed(1)} L/min
            </span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #888;">Trend:</span>
            <span style="color: ${
              selectedAnalytics.trend === 'increasing' ? '#4ade80' :
              selectedAnalytics.trend === 'decreasing' ? '#f87171' : '#888
            }; font-weight: bold;">
              ${selectedAnalytics.trend} (${selectedAnalytics.trendPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div style="height: 200px; margin-top: 12px;">
          ${createMiniChart(selectedAnalytics.history)}
        </div>
      ` : ''}
    </bim-panel-section>
  `;
};

// Simple canvas-based mini chart (can be replaced with Recharts/Chart.js)
function createMiniChart(history: HistoricalDataPoint[]): HTMLElement {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 150;
  const ctx = canvas.getContext('2d')!;

  if (history.length === 0) return canvas;

  // Draw line chart
  const rates = history.map(h => h.flowRate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;

  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < rates.length; i++) {
    const x = (i / (rates.length - 1)) * canvas.width;
    const y = canvas.height - ((rates[i] - min) / range) * canvas.height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
  return canvas;
}
```

---

## Integration with Main.ts

```typescript
// src/main.ts (additions)

import { IoTManager } from "./iot/services/IoTManager";
import { createIoTControlPanel } from "./ui/controls/IoTControlPanel";

// After world and components are initialized...
const iotManager = new IoTManager(components, world);

// Initialize flow meters from IFC
await iotManager.initializeFlowMeters();

// Listen for updates to update markers
iotManager.on("flowMeterUpdate", (meter: FlowMeter) => {
  // Update 3D marker position and label
  updateFlowMeterMarker(meter);
  // Update chart data
  updateChartPanel();
});

// Create UI panel
const [iotPanel] = BUI.Component.create(createIoTControlPanel, {
  iotManager,
  flowMeters: Array.from(iotManager.flowMeters.values()),
});

viewport.append(iotPanel);
```

---

## Configuration

```typescript
// src/iot/config.ts

export const IoT_CONFIG = {
  // Default update interval: 15 minutes
  DEFAULT_UPDATE_INTERVAL: 15 * 60 * 1000,

  // Historical data retention: 24 hours
  HISTORY_RETENTION_MS: 24 * 60 * 60 * 1000,

  // Maximum data points per meter
  MAX_DATA_POINTS: 10000,

  // Analytics periods (in milliseconds)
  ANALYTICS_PERIODS: {
    SHORT: 60 * 60 * 1000, // 1 hour
    MEDIUM: 24 * 60 * 60 * 1000, // 24 hours
    LONG: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Chart update interval
  CHART_REFRESH_RATE: 1000,

  // MQTT Configuration (future)
  MQTT: {
    DEFAULT_PORT: 1883,
    DEFAULT_TOPIC: "flowmeters/#",
  },

  // WebSocket Configuration
  WS: {
    DEFAULT_PORT: 8080,
    RECONNECT_DELAY: 1000,
    MAX_RECONNECT_ATTEMPTS: 5,
  },
};
```

---

## Testing Strategy

```typescript
// tests/iot/AnalyticsEngine.test.ts

describe("AnalyticsEngine", () => {
  let store: HistoricalStore;
  let engine: AnalyticsEngine;

  beforeEach(() => {
    store = new HistoricalStore();
    engine = new AnalyticsEngine(store);
  });

  it("should calculate moving average", () => {
    // Add test data
    for (let i = 0; i < 20; i++) {
      store.add("FM-001", {
        id: "FM-001",
        flowRate: 100 + i,
        flowPressure: 3,
        timestamp: Date.now() - i * 60000,
      });
    }

    const analytics = engine.calculate("FM-001", 60 * 60 * 1000);

    expect(analytics.movingAverage).toBeGreaterThan(0);
    expect(analytics.movingAverage).toBeLessThan(120);
  });

  it("should detect increasing trend", () => {
    // Add increasing data
    for (let i = 0; i < 20; i++) {
      store.add("FM-002", {
        id: "FM-002",
        flowRate: 100 + i * 5,
        flowPressure: 3,
        timestamp: Date.now() - i * 60000,
      });
    }

    const analytics = engine.calculate("FM-002", 60 * 60 * 1000);

    expect(analytics.trend).toBe("increasing");
    expect(analytics.trendPercentage).toBeGreaterThan(5);
  });
});
```

---

## Future IoT Integration Guide

### When real IoT data format is confirmed:

1. **MQTT Protocol**

   - Implement `MqttAdapter` using `mqtt` npm package
   - Configure topic patterns in `IoT_CONFIG`
   - Handle QoS levels and retained messages

2. **REST API Polling**

   - Create `RestApiAdapter` for HTTP polling
   - Implement retry logic and caching

3. **TCP Socket**

   - Create `TcpAdapter` for raw socket connections
   - Handle binary protocol parsing

4. **Cloud Platforms**
   - AWS IoT Core: Use AWS SDK
   - Azure IoT Hub: Use Azure SDK
   - Google Cloud IoT: Use GCP SDK

### Adding new adapter:

```typescript
// src/iot/adapters/NewAdapter.ts

import { IoTAdapter, IoTMessage } from "./IoTAdapter";

export class NewAdapter implements IoTAdapter {
  readonly name = 'NewAdapter';
  readonly supportedFormat = 'your-format';
  readonly isConnected = false;

  // Implement all required methods...
}

// Register in factory
// src/iot/adapters/index.ts

case 'your-format':
  return new NewAdapter(config);
```

---

## Summary

| Component           | Responsibility                                |
| ------------------- | --------------------------------------------- |
| **IoTManager**      | Orchestrates connections, manages flow meters |
| **DataSimulator**   | Generates realistic test data for 57 meters   |
| **HistoricalStore** | In-memory time-series data storage            |
| **AnalyticsEngine** | Calculates MA, EMA, night-low, trends         |
| **Adapters**        | Pluggable connectors (Simulator, WS, MQTT)    |
| **UI Controls**     | Settings panel, charts, flow meter selector   |

This architecture ensures clean separation of concerns, easy testing, and straightforward extension to real IoT devices.
