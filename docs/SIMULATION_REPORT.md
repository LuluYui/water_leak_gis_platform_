# Water Flow Data Simulation Report

## Executive Summary

- **Generated:** 2026-03-04T18:28:09.857Z
- **Total Flow Meters:** 57
- **Online Meters:** 57
- **Simulation Duration:** 1 hour
- **Update Interval:** 15 minutes
- **Data Points per Meter:** ~4

### Key Metrics

| Metric | Value |
|--------|-------|
| Average Flow Rate | 21.64 L/min |
| Average Pressure | 4.01 bar |
| Meters with Alerts | 42 |

## Flow Meter Distribution

| Pattern Type | Count |
|--------------|-------|
| Residential | 19 |
| Commercial | 19 |
| Industrial | 19 |

## Detailed Analytics (Last Hour)

### Top 10 Flow Meters by Flow Rate

| ID | Name | Flow Rate (L/min) | Pressure (bar) | Trend | Night Low |
|----|------|-------------------|----------------|-------|-----------|
| FM-008 | FlowMeter_FM-008 | 57.76 | 4.53 | stable ↓ | 50.82 |
| FM-002 | FlowMeter_FM-002 | 55.00 | 3.22 | decreasing ↓ | 47.85 |
| FM-005 | FlowMeter_FM-005 | 51.69 | 2.61 | stable ↓ | 46.11 |
| FM-020 | FlowMeter_FM-020 | 48.06 | 2.23 | stable ↑ | 38.39 |
| FM-056 | FlowMeter_FM-056 | 46.80 | 2.45 | decreasing ↓ | 38.26 |
| FM-038 | FlowMeter_FM-038 | 44.95 | 3.54 | decreasing ↓ | 36.25 |
| FM-023 | FlowMeter_FM-023 | 40.55 | 3.89 | decreasing ↓ | 33.92 |
| FM-026 | FlowMeter_FM-026 | 40.29 | 4.38 | decreasing ↓ | 33.70 |
| FM-053 | FlowMeter_FM-053 | 35.21 | 4.80 | decreasing ↓ | 25.87 |
| FM-029 | FlowMeter_FM-029 | 34.59 | 3.59 | increasing ↑ | 29.50 |

### Analytics Indicators Explained

| Indicator | Description | Formula |
|-----------|-------------|---------|
| **Moving Average (MA)** | Average flow rate over last 10 readings | Σ(value) / n |
| **Exponential Moving Average (EMA)** | Weighted average giving more weight to recent values | α × current + (1-α) × previous EMA |
| **Minimum Night Low** | Lowest flow during night hours (12am-5am) | min(night_readings) |
| **Standard Deviation** | Measure of flow rate variability | √(Σ(x - μ)² / n) |
| **Trend** | Direction of flow rate change | (recent_avg - previous_avg) / previous_avg × 100% |

## Trend Analysis

### Increasing Trend (Flow Rate Rising)

| ID | Name | Current (L/min) | Previous (L/min) | Change % |
|----|------|-----------------|-----------------|----------|
| FM-001 | FlowMeter_FM-001 | 6.68 | 2.67 | +150.00% |
| FM-007 | FlowMeter_FM-007 | 14.36 | 12.67 | +13.36% |
| FM-009 | FlowMeter_FM-009 | 7.82 | 5.33 | +46.66% |
| FM-014 | FlowMeter_FM-014 | 22.58 | 21.10 | +7.02% |
| FM-018 | FlowMeter_FM-018 | 19.87 | 13.65 | +45.62% |
| FM-022 | FlowMeter_FM-022 | 9.95 | 7.34 | +35.51% |
| FM-024 | FlowMeter_FM-024 | 26.66 | 23.88 | +11.62% |
| FM-028 | FlowMeter_FM-028 | 13.33 | 12.16 | +9.59% |
| FM-029 | FlowMeter_FM-029 | 34.59 | 32.66 | +5.92% |
| FM-030 | FlowMeter_FM-030 | 9.66 | 7.59 | +27.19% |

### Decreasing Trend (Flow Rate Falling)

| ID | Name | Current (L/min) | Previous (L/min) | Change % |
|----|------|-----------------|-----------------|----------|
| FM-002 | FlowMeter_FM-002 | 55.00 | 58.40 | -5.82% |
| FM-003 | FlowMeter_FM-003 | 15.32 | 16.98 | -9.77% |
| FM-004 | FlowMeter_FM-004 | 7.04 | 10.22 | -31.13% |
| FM-006 | FlowMeter_FM-006 | 15.48 | 16.59 | -6.69% |
| FM-011 | FlowMeter_FM-011 | 30.18 | 38.03 | -20.64% |
| FM-012 | FlowMeter_FM-012 | 10.25 | 12.79 | -19.86% |
| FM-013 | FlowMeter_FM-013 | 8.10 | 8.85 | -8.45% |
| FM-015 | FlowMeter_FM-015 | 12.09 | 13.79 | -12.32% |
| FM-017 | FlowMeter_FM-017 | 26.34 | 34.06 | -22.66% |
| FM-019 | FlowMeter_FM-019 | 12.36 | 13.27 | -6.86% |

## Alert Summary

Meters requiring attention (decreasing trend or abnormally low night flow):

| ID | Name | Issue | Value |
|----|------|-------|-------|
| FM-001 | FlowMeter_FM-001 | Low Night Flow | 0.0 L/min |
| FM-002 | FlowMeter_FM-002 | Decreasing Trend | -5.8% |
| FM-003 | FlowMeter_FM-003 | Decreasing Trend | -9.8% |
| FM-004 | FlowMeter_FM-004 | Decreasing Trend | -31.1% |
| FM-006 | FlowMeter_FM-006 | Decreasing Trend | -6.7% |
| FM-007 | FlowMeter_FM-007 | Low Night Flow | 7.5 L/min |
| FM-009 | FlowMeter_FM-009 | Low Night Flow | 1.3 L/min |
| FM-010 | FlowMeter_FM-010 | Low Night Flow | 3.9 L/min |
| FM-011 | FlowMeter_FM-011 | Decreasing Trend | -20.6% |
| FM-012 | FlowMeter_FM-012 | Decreasing Trend | -19.9% |
| FM-013 | FlowMeter_FM-013 | Decreasing Trend | -8.4% |
| FM-015 | FlowMeter_FM-015 | Decreasing Trend | -12.3% |
| FM-016 | FlowMeter_FM-016 | Low Night Flow | 5.4 L/min |
| FM-017 | FlowMeter_FM-017 | Decreasing Trend | -22.7% |
| FM-019 | FlowMeter_FM-019 | Decreasing Trend | -6.9% |
| FM-022 | FlowMeter_FM-022 | Low Night Flow | 1.2 L/min |
| FM-023 | FlowMeter_FM-023 | Decreasing Trend | -12.2% |
| FM-025 | FlowMeter_FM-025 | Decreasing Trend | -5.8% |
| FM-026 | FlowMeter_FM-026 | Decreasing Trend | -7.3% |
| FM-027 | FlowMeter_FM-027 | Decreasing Trend | -26.4% |
| FM-028 | FlowMeter_FM-028 | Low Night Flow | 8.3 L/min |
| FM-030 | FlowMeter_FM-030 | Low Night Flow | 3.1 L/min |
| FM-031 | FlowMeter_FM-031 | Low Night Flow | 3.2 L/min |
| FM-032 | FlowMeter_FM-032 | Decreasing Trend | -14.1% |
| FM-033 | FlowMeter_FM-033 | Low Night Flow | 0.4 L/min |
| FM-036 | FlowMeter_FM-036 | Decreasing Trend | -12.4% |
| FM-037 | FlowMeter_FM-037 | Low Night Flow | 4.5 L/min |
| FM-038 | FlowMeter_FM-038 | Decreasing Trend | -9.0% |
| FM-039 | FlowMeter_FM-039 | Decreasing Trend | -23.3% |
| FM-043 | FlowMeter_FM-043 | Decreasing Trend | -47.0% |
| FM-045 | FlowMeter_FM-045 | Decreasing Trend | -9.9% |
| FM-046 | FlowMeter_FM-046 | Low Night Flow | 3.9 L/min |
| FM-047 | FlowMeter_FM-047 | Decreasing Trend | -6.8% |
| FM-048 | FlowMeter_FM-048 | Decreasing Trend | -19.3% |
| FM-049 | FlowMeter_FM-049 | Decreasing Trend | -12.8% |
| FM-051 | FlowMeter_FM-051 | Decreasing Trend | -7.2% |
| FM-052 | FlowMeter_FM-052 | Low Night Flow | 6.9 L/min |
| FM-053 | FlowMeter_FM-053 | Decreasing Trend | -20.7% |
| FM-054 | FlowMeter_FM-054 | Low Night Flow | 0.0 L/min |
| FM-055 | FlowMeter_FM-055 | Decreasing Trend | -52.9% |
| FM-056 | FlowMeter_FM-056 | Decreasing Trend | -7.6% |
| FM-057 | FlowMeter_FM-057 | Low Night Flow | 4.5 L/min |

## Sample Data Export

Example: FM-001 last hour data

```
timestamp,flowRate,flowPressure
2026-03-04T18:28:09.837Z,9.01,4.7
2026-03-04T18:28:09.840Z,11.24,4.57
2026-03-04T18:28:09.840Z,11.1,4.45
2026-03-04T18:28:09.840Z,1.18,4.39
2026-03-04T18:28:09.840Z,10.04,4.67
2026-03-04T18:28:09.840Z,10.98,4.44
2026-03-04T18:28:09.840Z,1.49,4.4
2026-03-04T18:28:09.840Z,3.65,4.37
2026-03-04T18:28:09.841Z,1.27,4.59
2026-03-04T18:28:09.841Z,1.61,4.47
```

## Recommendations

1. **Monitor Decreasing Trends:** 10 meters showing decreasing flow rates
2. **Check Low Night Flow:** 25 meters with abnormally low night readings
3. **Peak Usage Hours:** Flow rates typically peak between 6-9 AM and 6-10 PM
4. **Night Baseline:** Average minimum night flow across all meters: 14.36 L/min

---
*Report generated by Water Flow Data Simulation System*
