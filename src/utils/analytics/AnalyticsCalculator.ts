import {
  HistoricalDataPoint,
  AnalyticsResult,
  LeakIndicators,
} from "../../types";
import { ANALYTICS_CONFIG } from "../../config/appConfig";

export function calculateAnalytics(
  history: HistoricalDataPoint[],
): AnalyticsResult {
  if (history.length === 0) {
    return { ma: 0, ema: 0, min: 0, max: 0, avg: 0 };
  }

  const values = history.map((h) => h.flowRate);

  const ma =
    values
      .slice(-ANALYTICS_CONFIG.movingAverageWindow)
      .reduce((a, b) => a + b, 0) /
    Math.min(ANALYTICS_CONFIG.movingAverageWindow, values.length);

  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema =
      ANALYTICS_CONFIG.emaSmoothingFactor * values[i] +
      (1 - ANALYTICS_CONFIG.emaSmoothingFactor) * ema;
  }

  return {
    ma,
    ema,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

export function calculateLeakIndicators(
  history: HistoricalDataPoint[],
): LeakIndicators {
  if (history.length === 0)
    return { mnf: 0, avg: 0, max: 0, isLeakLikely: false };
  const flows = history.map((h) => h.flowRate);

  const mnf = Math.min(...flows);
  const avg = flows.reduce((a, b) => a + b, 0) / flows.length;
  const max = Math.max(...flows);

  const isLeakLikely =
    mnf > avg * ANALYTICS_CONFIG.leakThreshold.mnfRatio &&
    avg > ANALYTICS_CONFIG.leakThreshold.minFlow;

  return { mnf, avg, max, isLeakLikely };
}
