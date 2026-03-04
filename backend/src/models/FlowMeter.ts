export type FlowPattern = "residential" | "commercial" | "industrial";

export interface FlowMeterConfig {
  id: string;
  name: string;
  baseFlowRate: number;
  basePressure: number;
  varianceFlow: number;
  variancePressure: number;
  pattern: FlowPattern;
}

export interface FlowMeterReading {
  id: string;
  flowRate: number;
  flowPressure: number;
  temperature?: number;
  timestamp: number;
}

export interface FlowMeterData {
  id: string;
  name: string;
  flowRate: number;
  flowPressure: number;
  temperature?: number;
  timestamp: Date;
  isOnline: boolean;
  lastUpdated: Date;
}
