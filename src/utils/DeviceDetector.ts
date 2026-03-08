export interface DeviceCapabilities {
  isLowMemory: boolean;
  isLowCPU: boolean;
  isLowEnd: boolean;
  memoryMB: number;
  cpuCores: number;
}

export function detectDeviceCapabilities(): DeviceCapabilities {
  const nav = navigator as unknown as {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  const memoryMB = (nav.deviceMemory || 8) * 1024;
  const cpuCores = nav.hardwareConcurrency || 8;

  const isLowMemory = memoryMB < 4096;
  const isLowCPU = cpuCores < 4;
  const isLowEnd = isLowMemory || isLowCPU;

  console.log(
    `[Performance] Device: ${cpuCores} cores, ~${Math.round(memoryMB / 1024)}GB RAM, Low-end: ${isLowEnd}`,
  );

  return {
    isLowMemory,
    isLowCPU,
    isLowEnd,
    memoryMB,
    cpuCores,
  };
}

export function getRecommendedSettings(capabilities: DeviceCapabilities) {
  return {
    enablePostProcessing: !capabilities.isLowEnd,
    enableFrustumCulling: true,
    enableOptimizations: capabilities.isLowEnd,
    markerMode: capabilities.isLowEnd ? "sprite" : "sprite",
    minSimulationIntervalMs: capabilities.isLowEnd ? 500 : 200,
  };
}
