import * as THREE from "three";

export interface HistoricalDataPoint {
  timestamp: number;
  flowRate: number;
  flowPressure: number;
}

export interface LiveFlowMeter {
  id: string;
  localId?: number;
  modelId?: string;
  position: THREE.Vector3;
  name: string;
  flowRate: number;
  flowPressure: number;
  temperature?: number;
  timestamp: Date;
  isOnline: boolean;
  baseFlowRate?: number;
}

export interface FlowMeterMarkerData {
  element: HTMLElement;
  position: THREE.Vector3;
  line?: THREE.Line;
  markerId_internal?: string | null;
  markerIdInternal?: string | null;
  leakPoints?: LeakPointConfig[];
}

export interface LeakPointConfig {
  id: string;
  name: string;
  elementIds: string[];
  leakRate: number;
  pressureDrop: number;
  isActive: boolean;
}

export interface IFCMeterData {
  localId: number;
  modelId: string;
  position: THREE.Vector3;
  name?: string;
}

export interface SimulationConfig {
  updateIntervalMs: number;
  maxHistoryPoints: number;
  markerOffset: THREE.Vector3;
}

export interface AnalyticsResult {
  ma: number;
  ema: number;
  min: number;
  max: number;
  avg: number;
}

export interface LeakIndicators {
  mnf: number;
  avg: number;
  max: number;
  isLeakLikely: boolean;
}
