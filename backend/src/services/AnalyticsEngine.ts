import {
  HistoricalDataPoint,
  FlowMeterAnalytics,
  AnalyticsSummary,
} from "../models/Analytics";
import { HistoricalStore } from "./HistoricalStore";
import { FlowMeterConfig, FlowMeterData } from "../models/FlowMeter";

export class AnalyticsEngine {
  constructor(private store: HistoricalStore) {}

  calculate(
    meterId: string,
    meterName: string,
    timeRangeMs: number,
  ): FlowMeterAnalytics {
    const history = this.store.getRange(meterId, timeRangeMs);

    if (history.length === 0) {
      return this.emptyAnalytics(meterId, meterName);
    }

    const flowRates = history.map((h) => h.flowRate);

    const movingAvg = this.movingAverage(flowRates, 10);
    const ema = this.exponentialMovingAverage(flowRates, 0.3);
    const minNightLow = this.minimumNightLow(history);
    const maxPeak = Math.max(...flowRates);
    const avg = this.average(flowRates);
    const stdDev = this.standardDeviation(flowRates);

    const { trend, percentage } = this.calculateTrend(flowRates);

    return {
      meterId,
      meterName,
      movingAverage: Math.round(movingAvg * 100) / 100,
      exponentialMovingAverage: Math.round(ema * 100) / 100,
      minimumNightLow: Math.round(minNightLow * 100) / 100,
      maximumPeak: Math.round(maxPeak * 100) / 100,
      average: Math.round(avg * 100) / 100,
      standardDeviation: Math.round(stdDev * 100) / 100,
      trend,
      trendPercentage: Math.round(percentage * 100) / 100,
      history,
      calculatedAt: new Date(),
    };
  }

  calculateAll(
    meters: FlowMeterConfig[],
    timeRangeMs: number,
  ): FlowMeterAnalytics[] {
    const analytics: FlowMeterAnalytics[] = [];

    for (const meter of meters) {
      const meterAnalytics = this.calculate(meter.id, meter.name, timeRangeMs);
      analytics.push(meterAnalytics);
    }

    return analytics;
  }

  calculateSummary(
    meters: FlowMeterData[],
    analytics: FlowMeterAnalytics[],
  ): AnalyticsSummary {
    const onlineMeters = meters.filter((m) => m.isOnline).length;
    const offlineMeters = meters.filter((m) => !m.isOnline).length;

    const avgFlowRate =
      meters.length > 0
        ? meters.reduce((sum, m) => sum + m.flowRate, 0) / meters.length
        : 0;

    const avgPressure =
      meters.length > 0
        ? meters.reduce((sum, m) => sum + m.flowPressure, 0) / meters.length
        : 0;

    const metersWithAlerts = analytics
      .filter((a) => a.trend === "decreasing" || a.minimumNightLow < 10)
      .map((a) => a.meterId);

    return {
      totalMeters: meters.length,
      onlineMeters,
      offlineMeters,
      averageFlowRate: Math.round(avgFlowRate * 100) / 100,
      averagePressure: Math.round(avgPressure * 100) / 100,
      metersWithAlerts,
      analytics,
    };
  }

  private movingAverage(values: number[], period: number): number {
    if (values.length < period) {
      return values.length > 0 ? this.average(values) : 0;
    }
    const slice = values.slice(-period);
    return this.average(slice);
  }

  private exponentialMovingAverage(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }
    return ema;
  }

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

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.average(values);
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }

  private calculateTrend(values: number[]): {
    trend: "increasing" | "decreasing" | "stable";
    percentage: number;
  } {
    if (values.length < 10) return { trend: "stable", percentage: 0 };

    const recent = values.slice(-5);
    const previous = values.slice(-10, -5);

    if (previous.length === 0 || this.average(previous) === 0) {
      return { trend: "stable", percentage: 0 };
    }

    const recentAvg = this.average(recent);
    const previousAvg = this.average(previous);

    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (changePercent > 5)
      return { trend: "increasing", percentage: changePercent };
    if (changePercent < -5)
      return { trend: "decreasing", percentage: changePercent };
    return { trend: "stable", percentage: changePercent };
  }

  private emptyAnalytics(
    meterId: string,
    meterName: string,
  ): FlowMeterAnalytics {
    return {
      meterId,
      meterName,
      movingAverage: 0,
      exponentialMovingAverage: 0,
      minimumNightLow: 0,
      maximumPeak: 0,
      average: 0,
      standardDeviation: 0,
      trend: "stable",
      trendPercentage: 0,
      history: [],
      calculatedAt: new Date(),
    };
  }
}
