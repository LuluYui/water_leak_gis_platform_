import * as THREE from "three";
import { LiveFlowMeter } from "../../types";
import { MARKER_CONFIG } from "../../config/appConfig";

export class ThrottledMarkerRenderer {
  private updateThrottleMs: number = 1000;
  private lastUpdateTime: Map<string, number> = new Map();

  constructor(updateThrottleMs: number = 1000) {
    this.updateThrottleMs = updateThrottleMs;
  }

  shouldUpdate(meterId: string): boolean {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(meterId) || 0;
    if (now - lastUpdate >= this.updateThrottleMs) {
      this.lastUpdateTime.set(meterId, now);
      return true;
    }
    return false;
  }

  createMarkerElement(meter: LiveFlowMeter, visible: boolean): HTMLElement {
    const element = document.createElement("div");
    element.className = "flow-meter-marker";
    element.id = `marker-${meter.id}`;
    element.style.cssText = `
      background: ${MARKER_CONFIG.styles.background};
      color: ${MARKER_CONFIG.styles.color};
      padding: ${MARKER_CONFIG.styles.padding};
      border-radius: ${MARKER_CONFIG.styles.borderRadius};
      font-family: ${MARKER_CONFIG.styles.fontFamily};
      font-size: ${MARKER_CONFIG.styles.fontSize};
      min-width: ${MARKER_CONFIG.styles.minWidth};
      border: ${MARKER_CONFIG.styles.borderWidth} solid ${MARKER_CONFIG.colors.marker};
      box-shadow: ${MARKER_CONFIG.styles.boxShadow};
      backdrop-filter: ${MARKER_CONFIG.styles.backdropFilter};
      pointer-events: none;
      display: ${visible ? "block" : "none"};
      z-index: ${MARKER_CONFIG.styles.zIndex};
      will-change: transform;
      transform: translateZ(0);
    `;
    this.updateMarkerContent(element, meter);
    return element;
  }

  updateMarkerContent(element: HTMLElement, meter: LiveFlowMeter): void {
    const flowRateColor =
      meter.flowRate > 150
        ? MARKER_CONFIG.colors.flowRate
        : meter.flowRate > 80
          ? "#fbbf24"
          : MARKER_CONFIG.colors.pressure;

    element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px; color: ${MARKER_CONFIG.colors.marker}; font-size: 12px;">
        ${meter.name}
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #9ca3af;">Flow:</span>
        <span style="color: ${flowRateColor}; font-weight: bold;">
          ${meter.flowRate.toFixed(1)} L/min
        </span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #9ca3af;">Pressure:</span>
        <span style="color: ${MARKER_CONFIG.colors.pressure}; font-weight: bold;">
          ${meter.flowPressure.toFixed(2)} bar
        </span>
      </div>
    `;
  }

  batchUpdateMarkers(
    flowMeters: Map<string, LiveFlowMeter>,
    markerData: Map<string, { element: HTMLElement; line?: THREE.Line }>,
  ): void {
    const now = Date.now();
    let updatedCount = 0;

    for (const [id, meter] of flowMeters) {
      const lastUpdate = this.lastUpdateTime.get(id) || 0;
      if (now - lastUpdate < this.updateThrottleMs) continue;

      this.lastUpdateTime.set(id, now);
      const data = markerData.get(id);
      if (data?.element) {
        this.updateMarkerContent(data.element, meter);
        updatedCount++;
      }
    }
  }
}
