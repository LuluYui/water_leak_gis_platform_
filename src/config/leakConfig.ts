export interface LeakPointConfig {
  id: string;
  name: string;
  elementIds: string[]; // Model-local IDs or names to identify leak points
  leakRate: number; // Extra flow in L/min when leak is active
  pressureDrop: number; // Pressure drop in bar
  isActive: boolean;
}

export const defaultLeakConfig: LeakPointConfig[] = [
  {
    id: "leak_1",
    name: "Main Chamber Leak",
    elementIds: ["Chamber-A", "Leak-Pit-01"],
    leakRate: 25,
    pressureDrop: 0.5,
    isActive: false,
  },
  {
    id: "leak_2",
    name: "Secondary Line Leak",
    elementIds: ["Manhole-05"],
    leakRate: 15,
    pressureDrop: 0.3,
    isActive: false,
  },
  {
    id: "leak_3",
    name: "Flow Segment Breach",
    elementIds: ["FlowSegment-12"],
    leakRate: 40,
    pressureDrop: 0.8,
    isActive: false,
  },
];
