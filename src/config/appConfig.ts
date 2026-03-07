import * as THREE from "three";

export interface HK80Offset {
  easting: number;
  northing: number;
  elevation: number;
}

export const COORDINATE_CONFIG = {
  defaultOffset: {
    easting: 827961.539,
    northing: 824013.889,
    elevation: 0,
  } as HK80Offset,
};

export const CAMERA_CONFIG = {
  defaultPosition: {
    x: -50,
    y: 70,
    z: 70,
  } as THREE.Vector3,
  target: {
    x: -116,
    y: 0,
    z: 30,
  } as THREE.Vector3,
  near: 0.01,
  restThreshold: 0.05,
};

export const SIMULATION_CONFIG = {
  defaultIntervalMs: 5000,
  maxHistoryPoints: 100,
  markerOffset: new THREE.Vector3(0, 5, 0),
  flowRate: {
    daytimeMin: 50,
    daytimeMax: 150,
    nightMin: 5,
    nightMax: 15,
    basePressure: 3.5,
    basePressureVariation: 1.5,
    targetPressure: 4.0,
  },
  diurnal: {
    nightMin: 3,
    nightMax: 5,
    morningStart: 6,
    morningEnd: 9,
    morningFactor: 0.8,
    peakStart: 10,
    peakEnd: 12,
    peakFactor: 1.2,
    afternoonStart: 13,
    afternoonEnd: 17,
    afternoonFactor: 0.9,
    eveningStart: 18,
    eveningEnd: 21,
    eveningFactor: 1.1,
    nightStart: 22,
    nightFactor: 0.3,
  },
  smoothing: {
    flowChangeFactor: 0.1,
    flowNoiseRange: 2,
    pressureChangeFactor: 0.1,
    pressureNoiseRange: 0.05,
  },
  leak: {
    flowVariationMin: 0.8,
    flowVariationMax: 1.2,
  },
};

export const MARKER_CONFIG = {
  colors: {
    marker: "#4a90d9",
    line: "#4a90d9",
    flowRate: "#4ade80",
    pressure: "#f87171",
  },
  styles: {
    background: "rgba(0, 0, 0, 0.9)",
    color: "white",
    padding: "8px 12px",
    borderRadius: "8px",
    fontFamily: "sans-serif",
    fontSize: "11px",
    minWidth: "130px",
    borderWidth: "2px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    backdropFilter: "blur(4px)",
    zIndex: "10000",
  },
};

export const CHART_CONFIG = {
  small: {
    width: 280,
    height: 100,
    padding: 10,
  },
  large: {
    width: 600,
    height: 300,
    padding: 25,
  },
  gridLines: 4,
  colors: {
    flowRate: "#4ade80",
    pressure: "#f87171",
    ma: "#60a5fa",
    ema: "#a78bfa",
    text: "#9ca3af",
    textDark: "#6b7280",
  },
};

export const ANALYTICS_CONFIG = {
  movingAverageWindow: 10,
  emaSmoothingFactor: 0.3,
  leakThreshold: {
    mnfRatio: 0.7,
    minFlow: 10,
  },
};

export const UI_CONFIG = {
  refreshInterval: 5000,
  maxTableRows: 10,
  maxListHeight: 220,
  maxFilterHeight: 400,
};
