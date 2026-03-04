import { HistoricalDataPoint } from "../models/Analytics";
import { FlowMeterReading } from "../models/FlowMeter";

export class HistoricalStore {
  private data: Map<string, HistoricalDataPoint[]> = new Map();
  private maxPointsPerMeter: number;

  constructor(maxPointsPerMeter: number = 10000) {
    this.maxPointsPerMeter = maxPointsPerMeter;
  }

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

  exportCSV(meterId: string): string {
    const data = this.data.get(meterId) || [];
    let csv = "timestamp,datetime,flowRate,flowPressure\n";

    for (const point of data) {
      csv += `${point.timestamp},${new Date(point.timestamp).toISOString()},${point.flowRate},${point.flowPressure}\n`;
    }

    return csv;
  }
}
