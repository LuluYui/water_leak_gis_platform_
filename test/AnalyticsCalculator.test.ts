import { describe, it, expect } from "vitest";
import {
  calculateAnalytics,
  calculateLeakIndicators,
} from "../src/utils/analytics/AnalyticsCalculator";
import { HistoricalDataPoint } from "../src/types";

describe("AnalyticsCalculator", () => {
  const createHistory = (flows: number[]): HistoricalDataPoint[] => {
    const now = Date.now();
    return flows.map((flowRate, index) => ({
      timestamp: now - (flows.length - index) * 1000,
      flowRate,
      flowPressure: 3.5,
    }));
  };

  describe("calculateAnalytics", () => {
    it("should return zeros for empty history", () => {
      const result = calculateAnalytics([]);
      expect(result.ma).toBe(0);
      expect(result.ema).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.avg).toBe(0);
    });

    it("should calculate correct statistics", () => {
      const history = createHistory([10, 20, 30, 40, 50]);
      const result = calculateAnalytics(history);

      expect(result.min).toBe(10);
      expect(result.max).toBe(50);
      expect(result.avg).toBe(30);
    });

    it("should calculate moving average correctly", () => {
      const history = createHistory([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      const result = calculateAnalytics(history);

      expect(result.ma).toBe(55);
    });

    it("should calculate EMA correctly", () => {
      const history = createHistory([10, 20, 30]);
      const result = calculateAnalytics(history);

      expect(result.ema).toBeGreaterThan(0);
      expect(result.ema).toBeLessThanOrEqual(30);
    });
  });

  describe("calculateLeakIndicators", () => {
    it("should return zeros for empty history", () => {
      const result = calculateLeakIndicators([]);
      expect(result.mnf).toBe(0);
      expect(result.avg).toBe(0);
      expect(result.max).toBe(0);
      expect(result.isLeakLikely).toBe(false);
    });

    it("should detect leak when MNF is high compared to average", () => {
      const history = createHistory([50, 52, 48, 51, 49, 70, 72, 68]);
      const result = calculateLeakIndicators(history);

      expect(result.isLeakLikely).toBe(true);
    });

    it("should not detect leak when flow is low", () => {
      const history = createHistory([2, 3, 2, 3, 2, 3, 4, 2]);
      const result = calculateLeakIndicators(history);

      expect(result.isLeakLikely).toBe(false);
    });
  });
});
