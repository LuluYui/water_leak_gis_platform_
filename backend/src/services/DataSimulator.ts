import {
  FlowMeterConfig,
  FlowMeterReading,
  FlowMeterData,
  FlowPattern,
} from "../models/FlowMeter";
import { FLOW_PATTERNS } from "../utils/patterns";

export class DataSimulator {
  private patterns = FLOW_PATTERNS;

  generateReading(config: FlowMeterConfig): FlowMeterReading {
    const now = new Date();
    const hour = now.getHours();

    const pattern = this.patterns[config.pattern] || FLOW_PATTERNS.residential;
    const patternMultiplier = pattern[hour];

    const baseFlow = config.baseFlowRate * patternMultiplier;
    const basePressure = config.basePressure;

    const flowNoise = (Math.random() - 0.5) * config.varianceFlow;
    const pressureNoise = (Math.random() - 0.5) * config.variancePressure;

    const flowSpike = Math.random() > 0.98 ? Math.random() * 20 : 0;
    const pressureSpike = Math.random() > 0.98 ? Math.random() * 0.5 : 0;

    const flowRate = Math.max(0, baseFlow + flowNoise + flowSpike);
    const pressure = Math.max(0, basePressure + pressureNoise + pressureSpike);

    const temperature = 15 + Math.random() * 10;

    return {
      id: config.id,
      flowRate: Math.round(flowRate * 100) / 100,
      flowPressure: Math.round(pressure * 100) / 100,
      temperature: Math.round(temperature * 10) / 10,
      timestamp: now.getTime(),
    };
  }

  generate57FlowMeters(): FlowMeterConfig[] {
    const meters: FlowMeterConfig[] = [];
    const patterns: FlowPattern[] = ["residential", "commercial", "industrial"];

    for (let i = 1; i <= 57; i++) {
      const id = `FM-${String(i).padStart(3, "0")}`;
      const pattern = patterns[i % 3];
      const baseFlow = 50 + Math.random() * 150;

      meters.push({
        id,
        name: `FlowMeter_${id}`,
        baseFlowRate: Math.round(baseFlow),
        basePressure: Math.round((2 + Math.random() * 4) * 100) / 100,
        varianceFlow: Math.round(10 + Math.random() * 10),
        variancePressure: Math.round((0.2 + Math.random() * 0.3) * 100) / 100,
        pattern,
      });
    }

    return meters;
  }

  getMeterDataFromConfig(config: FlowMeterConfig): FlowMeterData {
    const reading = this.generateReading(config);
    return {
      id: config.id,
      name: config.name,
      flowRate: reading.flowRate,
      flowPressure: reading.flowPressure,
      temperature: reading.temperature,
      timestamp: new Date(reading.timestamp),
      isOnline: true,
      lastUpdated: new Date(),
    };
  }
}
