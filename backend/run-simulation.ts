import { IoTManager } from "./src/services/IoTManager";
import { PATTERN_NAMES } from "./src/utils/patterns";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIMULATION_DURATION_MS = 5 * 60 * 1000;
const UPDATE_INTERVAL_MS = 15 * 1000;
const TIME_RANGES = {
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
};

async function runSimulation(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  WATER FLOW DATA SIMULATION - 57 FLOW METERS");
  console.log("=".repeat(60));
  console.log();

  const iotManager = new IoTManager(UPDATE_INTERVAL_MS);

  console.log("[1] Initializing 57 Flow Meters...");
  iotManager.initialize57FlowMeters();

  const configs = iotManager.getFlowMeterConfigs();
  console.log(`    ✓ Created ${configs.length} flow meters`);

  const residential = configs.filter((c) => c.pattern === "residential").length;
  const commercial = configs.filter((c) => c.pattern === "commercial").length;
  const industrial = configs.filter((c) => c.pattern === "industrial").length;
  console.log(`    - Residential: ${residential}`);
  console.log(`    - Commercial: ${commercial}`);
  console.log(`    - Industrial: ${industrial}`);
  console.log();

  console.log("[2] Running Simulation...");
  console.log(`    Update interval: ${UPDATE_INTERVAL_MS / 60000} minutes`);
  console.log(`    Duration: ${SIMULATION_DURATION_MS / 60000} minutes`);
  console.log(
    `    Expected data points per meter: ${SIMULATION_DURATION_MS / UPDATE_INTERVAL_MS}`,
  );
  console.log();

  const totalUpdates = Math.ceil(SIMULATION_DURATION_MS / UPDATE_INTERVAL_MS);

  for (let i = 0; i < totalUpdates; i++) {
    iotManager.generateReadings();
    const progress = Math.round(((i + 1) / totalUpdates) * 100);
    process.stdout.write(
      `\r    Progress: ${progress}% (${i + 1}/${totalUpdates} updates)`,
    );
  }

  console.log();
  console.log(`    ✓ Completed ${totalUpdates} update cycles`);
  console.log();

  console.log("[3] Generating Analytics...");
  const summary = iotManager.getAnalyticsSummary(TIME_RANGES.HOUR);

  console.log(`    Total meters: ${summary.totalMeters}`);
  console.log(`    Online meters: ${summary.onlineMeters}`);
  console.log(
    `    Average flow rate: ${summary.averageFlowRate.toFixed(2)} L/min`,
  );
  console.log(
    `    Average pressure: ${summary.averagePressure.toFixed(2)} bar`,
  );
  console.log();

  console.log("[4] Generating Report...");
  const report = generateReport(iotManager, summary);

  const reportPath =
    "/home/luluyip/projects/gis/thatopen/template/docs/SIMULATION_REPORT.md";
  fs.writeFileSync(reportPath, report);
  console.log(`    ✓ Report saved to: ${reportPath}`);
  console.log();

  console.log("=".repeat(60));
  console.log("  SIMULATION COMPLETE");
  console.log("=".repeat(60));
}

function generateReport(iotManager: IoTManager, summary: any): string {
  const now = new Date().toISOString();
  const analytics = summary.analytics;

  let report = `# Water Flow Data Simulation Report

## Executive Summary

- **Generated:** ${now}
- **Total Flow Meters:** ${summary.totalMeters}
- **Online Meters:** ${summary.onlineMeters}
- **Simulation Duration:** 1 hour
- **Update Interval:** 15 minutes
- **Data Points per Meter:** ~4

### Key Metrics

| Metric | Value |
|--------|-------|
| Average Flow Rate | ${summary.averageFlowRate.toFixed(2)} L/min |
| Average Pressure | ${summary.averagePressure.toFixed(2)} bar |
| Meters with Alerts | ${summary.metersWithAlerts.length} |

## Flow Meter Distribution

| Pattern Type | Count |
|--------------|-------|
| Residential | ${analytics.filter((a: any) => a.meterId.includes("FM-") && parseInt(a.meterId.split("-")[1]) % 3 === 1).length} |
| Commercial | ${analytics.filter((a: any) => a.meterId.includes("FM-") && parseInt(a.meterId.split("-")[1]) % 3 === 2).length} |
| Industrial | ${analytics.filter((a: any) => a.meterId.includes("FM-") && parseInt(a.meterId.split("-")[1]) % 3 === 0).length} |

## Detailed Analytics (Last Hour)

### Top 10 Flow Meters by Flow Rate

| ID | Name | Flow Rate (L/min) | Pressure (bar) | Trend | Night Low |
|----|------|-------------------|----------------|-------|-----------|
`;

  const sortedByFlow = [...analytics]
    .sort((a, b) => b.average - a.average)
    .slice(0, 10);

  for (const a of sortedByFlow) {
    const meter = iotManager.getFlowMeter(a.meterId);
    report += `| ${a.meterId} | ${a.meterName} | ${a.average.toFixed(2)} | ${meter?.flowPressure.toFixed(2) || "N/A"} | ${a.trend} ${a.trendPercentage > 0 ? "↑" : a.trendPercentage < 0 ? "↓" : "→"} | ${a.minimumNightLow.toFixed(2)} |\n`;
  }

  report += `
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
`;

  const increasingTrend = analytics
    .filter((a: any) => a.trend === "increasing")
    .slice(0, 10);
  if (increasingTrend.length === 0) {
    report += "| - | - | - | - | - |\n";
  } else {
    for (const a of increasingTrend) {
      report += `| ${a.meterId} | ${a.meterName} | ${a.average.toFixed(2)} | ${(a.average / (1 + a.trendPercentage / 100)).toFixed(2)} | +${a.trendPercentage.toFixed(2)}% |\n`;
    }
  }

  report += `
### Decreasing Trend (Flow Rate Falling)

| ID | Name | Current (L/min) | Previous (L/min) | Change % |
|----|------|-----------------|-----------------|----------|
`;

  const decreasingTrend = analytics
    .filter((a: any) => a.trend === "decreasing")
    .slice(0, 10);
  if (decreasingTrend.length === 0) {
    report += "| - | - | - | - | - |\n";
  } else {
    for (const a of decreasingTrend) {
      report += `| ${a.meterId} | ${a.meterName} | ${a.average.toFixed(2)} | ${(a.average / (1 + a.trendPercentage / 100)).toFixed(2)} | ${a.trendPercentage.toFixed(2)}% |\n`;
    }
  }

  report += `
## Alert Summary

Meters requiring attention (decreasing trend or abnormally low night flow):

| ID | Name | Issue | Value |
|----|------|-------|-------|
`;

  const alerts = analytics.filter(
    (a: any) => a.trend === "decreasing" || a.minimumNightLow < 10,
  );
  if (alerts.length === 0) {
    report += "| - | No alerts | - | - |\n";
  } else {
    for (const a of alerts) {
      const issue =
        a.trend === "decreasing" ? "Decreasing Trend" : "Low Night Flow";
      const value =
        a.trend === "decreasing"
          ? `${a.trendPercentage.toFixed(1)}%`
          : `${a.minimumNightLow.toFixed(1)} L/min`;
      report += `| ${a.meterId} | ${a.meterName} | ${issue} | ${value} |\n`;
    }
  }

  report += `
## Sample Data Export

Example: FM-001 last hour data

\`\`\`
timestamp,flowRate,flowPressure
`;

  const history = iotManager
    .getHistoricalData("FM-001", TIME_RANGES.HOUR)
    .slice(0, 10);
  for (const point of history) {
    report += `${new Date(point.timestamp).toISOString()},${point.flowRate},${point.flowPressure}\n`;
  }

  report += `\`\`\`

## Recommendations

1. **Monitor Decreasing Trends:** ${decreasingTrend.length} meters showing decreasing flow rates
2. **Check Low Night Flow:** ${analytics.filter((a: any) => a.minimumNightLow < 10).length} meters with abnormally low night readings
3. **Peak Usage Hours:** Flow rates typically peak between 6-9 AM and 6-10 PM
4. **Night Baseline:** Average minimum night flow across all meters: ${(analytics.reduce((sum: number, a: any) => sum + a.minimumNightLow, 0) / analytics.length).toFixed(2)} L/min

---
*Report generated by Water Flow Data Simulation System*
`;

  return report;
}

runSimulation().catch(console.error);
