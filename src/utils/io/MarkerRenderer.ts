import * as THREE from "three";
import { LiveFlowMeter } from "../../types";
import { MARKER_CONFIG, SIMULATION_CONFIG } from "../../config/appConfig";

export class MarkerRenderer {
  private markerOffset: THREE.Vector3;

  constructor() {
    this.markerOffset = SIMULATION_CONFIG.markerOffset;
  }

  createMarkerElement(meter: LiveFlowMeter, visible: boolean): HTMLElement {
    const element = document.createElement("div");
    element.className = "flow-meter-marker";
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
    `;
    this.updateMarkerContent(element, meter);
    return element;
  }

  updateMarkerContent(element: HTMLElement, meter: LiveFlowMeter): void {
    element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px; color: ${MARKER_CONFIG.colors.marker}; font-size: 12px;">
        ${meter.name}
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #9ca3af;">Flow:</span>
        <span style="color: ${MARKER_CONFIG.colors.flowRate}; font-weight: bold;">
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

  getMarkerPosition(meter: LiveFlowMeter): THREE.Vector3 {
    return meter.position.clone().add(this.markerOffset);
  }

  createLinkageLine(
    meterPosition: THREE.Vector3,
    markerPosition: THREE.Vector3,
    visible: boolean,
  ): THREE.Line {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      meterPosition,
      markerPosition,
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: MARKER_CONFIG.colors.line,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.visible = visible;
    return line;
  }

  setVisible(element: HTMLElement, line: THREE.Line, visible: boolean): void {
    element.style.display = visible ? "block" : "none";
    line.visible = visible;
  }
}
