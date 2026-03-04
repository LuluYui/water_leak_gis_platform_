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

  addBatch(meterId: string, readings: FlowMeterReading[]): void {
    for (const reading of readings) {
      this.add(meterId, reading);
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

  getAllMeters(): string[] {
    return Array.from(this.data.keys());
  }

  clear(): void {
    this.data.clear();
  }

  clearMeter(meterId: string): void {
    this.data.delete(meterId);
  }

  exportCSV(meterId: string): string {
    const data = this.data.get(meterId) || [];
    let csv = "timestamp,datetime,flowRate,flowPressure\n";

    for (const point of data) {
      csv += `${point.timestamp},${new Date(point.timestamp).toISOString()},${point.flowRate},${point.flowPressure}\n`;
    }

    return csv;
  }

  getStats(
    meterId: string,
  ): { count: number; startTime: number; endTime: number } | null {
    const meterData = this.data.get(meterId);
    if (!meterData || meterData.length === 0) return null;

    return {
      count: meterData.length,
      startTime: meterData[0].timestamp,
      endTime: meterData[meterData.length - 1].timestamp,
    };
  }
}
