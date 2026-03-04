export interface HistoricalDataPoint {
  timestamp: number;
  flowRate: number;
  flowPressure: number;
}

export interface FlowMeterAnalytics {
  meterId: string;
  meterName: string;

  movingAverage: number;
  exponentialMovingAverage: number;
  minimumNightLow: number;
  maximumPeak: number;
  average: number;
  standardDeviation: number;

  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number;

  history: HistoricalDataPoint[];

  calculatedAt: Date;
}

export interface AnalyticsSummary {
  totalMeters: number;
  onlineMeters: number;
  offlineMeters: number;

  averageFlowRate: number;
  averagePressure: number;

  metersWithAlerts: string[];

  analytics: FlowMeterAnalytics[];
}
