import { FlowPattern } from "../models/FlowMeter";

export const RESIDENTIAL_DAY_PATTERN: number[] = [
  0.3,
  0.2,
  0.15,
  0.1,
  0.1,
  0.2, // 0-5 AM (night - very low)
  0.5,
  0.8,
  1.0,
  0.9,
  0.8,
  0.9, // 6-11 AM (morning ramp up)
  1.0,
  0.85,
  0.8,
  0.85,
  1.0,
  1.1, // 12-5 PM (midday)
  1.2,
  1.1,
  0.9,
  0.7,
  0.5,
  0.4, // 6-11 PM (evening peak then decline)
];

export const COMMERCIAL_DAY_PATTERN: number[] = [
  0.2,
  0.15,
  0.1,
  0.1,
  0.15,
  0.3, // 0-5 AM (night - minimal)
  0.6,
  0.9,
  1.2,
  1.3,
  1.4,
  1.3, // 6-11 AM (business hours start)
  1.2,
  1.1,
  1.2,
  1.3,
  1.4,
  1.2, // 12-5 PM (lunch/midday)
  1.0,
  0.7,
  0.5,
  0.3,
  0.25,
  0.2, // 6-11 PM (evening wind down)
];

export const INDUSTRIAL_DAY_PATTERN: number[] = [
  0.4,
  0.35,
  0.3,
  0.3,
  0.35,
  0.5, // 0-5 AM (partial night operation)
  0.8,
  1.1,
  1.4,
  1.5,
  1.5,
  1.4, // 6-11 AM (full shift starts)
  1.3,
  1.2,
  1.3,
  1.4,
  1.5,
  1.4, // 12-5 PM (continuous operation)
  1.3,
  1.1,
  0.9,
  0.7,
  0.55,
  0.45, // 6-11 PM (shift end)
];

export const FLOW_PATTERNS: Record<FlowPattern, number[]> = {
  residential: RESIDENTIAL_DAY_PATTERN,
  commercial: COMMERCIAL_DAY_PATTERN,
  industrial: INDUSTRIAL_DAY_PATTERN,
};

export const PATTERN_NAMES: Record<FlowPattern, string> = {
  residential: "Residential Building",
  commercial: "Commercial Building",
  industrial: "Industrial Facility",
};
