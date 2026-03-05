import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";

export interface HistoricalDataPoint {
  timestamp: number;
  flowRate: number;
  flowPressure: number;
}

export interface LiveFlowMeter {
  id: string;
  localId?: number;
  modelId?: string;
  position: THREE.Vector3;
  name: string;
  flowRate: number;
  flowPressure: number;
  temperature?: number;
  timestamp: Date;
  isOnline: boolean;
}

export interface FlowMeterMarkerData {
  element: HTMLElement;
  position: THREE.Vector3;
  line?: THREE.Line;
  markerId_internal?: string | null;
}

const MARKER_COLOR = "#4a90d9";
const LINE_COLOR = "#4a90d9";

type FlowMeterUpdateCallback = (meter: LiveFlowMeter) => void;

class SimpleEventEmitter {
  private events: Map<string, FlowMeterUpdateCallback[]> = new Map();

  on(event: string, callback: FlowMeterUpdateCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, args?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(args);
      }
    }
  }
}

export class LiveIoTManager extends SimpleEventEmitter {
  private markerComponent: OBF.Marker | null = null;
  private world: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBF.PostproductionRenderer
  > | null = null;

  private flowMeters: Map<string, LiveFlowMeter> = new Map();
  private markerData: Map<string, FlowMeterMarkerData> = new Map();
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private maxHistoryPoints: number = 100;

  private updateIntervalMs: number = 5000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;

  public markersVisible: boolean = true;
  private markerOffset: THREE.Vector3 = new THREE.Vector3(0, 5, 0);

  private allMarkerElements: HTMLElement[] = [];
  private allClusterElements: HTMLElement[] = [];
  private autoClusterOriginallyEnabled: boolean = true;

  initialize(
    components: OBC.Components,
    world: OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBF.PostproductionRenderer
    >,
  ): void {
    this.world = world;
    this.markerComponent = components.get(OBF.Marker);
    this.markerComponent.threshold = 10;
    this.autoClusterOriginallyEnabled =
      (this.markerComponent as any).autoCluster !== false;
  }

  initializeFromIFCMeters(
    ifcMeters: {
      localId: number;
      modelId: string;
      position: THREE.Vector3;
      name: string;
    }[],
  ): void {
    this.flowMeters.clear();

    for (const ifcMeter of ifcMeters) {
      const id = `${ifcMeter.modelId}-${ifcMeter.localId}`;
      const baseFlowRate = 50 + Math.random() * 150;
      const basePressure = 2 + Math.random() * 4;

      const flowMeter: LiveFlowMeter = {
        id,
        localId: ifcMeter.localId,
        modelId: ifcMeter.modelId,
        position: ifcMeter.position,
        name: ifcMeter.name,
        flowRate: baseFlowRate,
        flowPressure: basePressure,
        temperature: 15 + Math.random() * 10,
        timestamp: new Date(),
        isOnline: true,
      };

      this.flowMeters.set(id, flowMeter);
    }
  }

  startSimulation(): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(
      () => this.updateSimulationData(),
      this.updateIntervalMs,
    );
    this.updateSimulationData();
  }

  stopSimulation(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  toggleMarkersVisibility(): void {
    this.markersVisible = !this.markersVisible;
    this.applyVisibilityToAll();
    this.emit("visibilityChanged", this.markersVisible);
  }

  private applyVisibilityToAll(): void {
    if (!this.world || !this.markerComponent) return;

    this.markerComponent.enabled = this.markersVisible;

    const markerAny = this.markerComponent as any;

    if (!this.markersVisible) {
      markerAny.autoCluster = false;
      this.hideAllClusterElements();
    } else {
      markerAny.autoCluster = this.autoClusterOriginallyEnabled;
      this.showAllClusterElements();
      this.triggerClustering();
    }

    for (const [, data] of this.markerData) {
      if (data.element) {
        data.element.style.display = this.markersVisible ? "block" : "none";
      }
      if (data.line) {
        data.line.visible = this.markersVisible;
      }
    }
  }

  private hideAllClusterElements(): void {
    const viewport = document.querySelector("bim-viewport");
    if (!viewport) return;

    this.allClusterElements = [];

    const selectors = [
      ".bim-label",
      "[class*='cluster']",
      "span[class*='bim-label']",
    ];

    for (const selector of selectors) {
      const elements = viewport.querySelectorAll(selector);
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.setProperty("display", "none", "important");
        this.allClusterElements.push(htmlEl);
      });
    }

    const allSpans = viewport.querySelectorAll("span");
    for (const span of allSpans) {
      const htmlSpan = span as HTMLElement;
      const style = htmlSpan.style;

      const isClusterSpan =
        style.position === "absolute" &&
        style.pointerEvents === "auto" &&
        style.zIndex &&
        parseInt(style.zIndex) > 0 &&
        style.transform &&
        style.transform.includes("translate");

      if (isClusterSpan) {
        const childDiv = htmlSpan.querySelector("div");
        const isClusterBubble =
          childDiv &&
          (childDiv.style.borderRadius === "50%" ||
            childDiv.style.borderRadius === "") &&
          childDiv.style.fontSize === "1.2rem" &&
          childDiv.style.textAlign === "center";

        if (isClusterBubble) {
          if (!this.allClusterElements.includes(htmlSpan)) {
            this.allClusterElements.push(htmlSpan);
            htmlSpan.style.setProperty("display", "none", "important");
          }
        }
      }
    }

    const allDivs = viewport.querySelectorAll("div");
    for (const div of allDivs) {
      const htmlDiv = div as HTMLElement;
      const style = htmlDiv.style;

      const isClusterBubble =
        style.borderRadius === "100%" &&
        (style.fontSize === "3.2rem" || style.fontSize === "1.2rem") &&
        style.textAlign === "center";

      if (isClusterBubble) {
        const parent = htmlDiv.parentElement;
        if (parent) {
          const parentHtml = parent as HTMLElement;
          if (parentHtml.tagName === "SPAN") {
            parentHtml.style.setProperty("display", "none", "important");
            if (!this.allClusterElements.includes(parentHtml)) {
              this.allClusterElements.push(parentHtml);
            }
          } else {
            htmlDiv.style.setProperty("display", "none", "important");
            if (!this.allClusterElements.includes(htmlDiv)) {
              this.allClusterElements.push(htmlDiv);
            }
          }
        }
      }
    }

    try {
      const markerAny = this.markerComponent as any;
      if (markerAny._clusters) {
        markerAny._clusters.forEach((cluster: any) => {
          if (
            cluster.label &&
            cluster.label.three &&
            cluster.label.three.element
          ) {
            const el = cluster.label.three.element;
            el.style.setProperty("display", "none", "important");
            if (el.parentElement) {
              el.parentElement.style.setProperty(
                "display",
                "none",
                "important",
              );
              if (!this.allClusterElements.includes(el.parentElement)) {
                this.allClusterElements.push(el.parentElement);
              }
            }
          }
        });
      }
      if (markerAny.clusterLabels) {
        markerAny.clusterLabels.forEach((cluster: any) => {
          if (
            cluster &&
            cluster.label &&
            cluster.label.three &&
            cluster.label.three.element
          ) {
            const el = cluster.label.three.element;
            el.style.setProperty("display", "none", "important");
            if (el.parentElement) {
              el.parentElement.style.setProperty(
                "display",
                "none",
                "important",
              );
              if (!this.allClusterElements.includes(el.parentElement)) {
                this.allClusterElements.push(el.parentElement);
              }
            }
          }
        });
      }
    } catch (e) {
      // Ignore errors accessing internal marker properties
    }
  }

  private showAllClusterElements(): void {
    for (const el of this.allClusterElements) {
      el.style.removeProperty("display");
    }
  }

  private triggerClustering(): void {
    if (!this.markersVisible || !this.world || !this.markerComponent) return;

    try {
      (this.markerComponent as any).cluster(this.world);
    } catch (e) {
      // Clustering may fail if no markers exist yet
    }
  }

  clearAllClusterElements(): void {
    this.allClusterElements = [];
  }

  private updateSimulationData(): void {
    if (!this.world) return;

    for (const [id, meter] of this.flowMeters) {
      meter.flowRate = Math.max(
        0,
        meter.flowRate * (0.95 + Math.random() * 0.1) +
          (Math.random() - 0.5) * 5,
      );
      meter.flowPressure = Math.max(
        0,
        meter.flowPressure + (Math.random() - 0.5) * 0.1,
      );
      meter.timestamp = new Date();

      if (!this.historicalData.has(id)) this.historicalData.set(id, []);
      const history = this.historicalData.get(id)!;
      history.push({
        timestamp: meter.timestamp.getTime(),
        flowRate: meter.flowRate,
        flowPressure: meter.flowPressure,
      });
      if (history.length > this.maxHistoryPoints) history.shift();

      this.updateMarker(id);
      this.emit("flowMeterUpdate", meter);
    }
    this.emit("updateCycleComplete", Array.from(this.flowMeters.values()));
  }

  createMarkers(): void {
    if (!this.world || !this.markerComponent) return;
    this.clearAllClusterElements();
    this.allMarkerElements = [];
    for (const [id, meter] of this.flowMeters) {
      this.createMarker(id, meter);
    }
    if (this.markersVisible) {
      this.triggerClustering();
    }
  }

  private createMarker(id: string, meter: LiveFlowMeter): void {
    if (!this.world || !this.markerComponent) return;

    const element = document.createElement("div");
    element.className = "flow-meter-marker";
    element.style.cssText = `
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: sans-serif;
      font-size: 11px;
      min-width: 130px;
      border: 2px solid ${MARKER_COLOR};
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      pointer-events: none;
      display: ${this.markersVisible ? "block" : "none"};
    `;
    this.updateMarkerContent(element, meter);
    this.allMarkerElements.push(element);

    const markerPosition = meter.position.clone().add(this.markerOffset);

    // Marker create returns the id
    const markerId_internal = this.markerComponent.create(
      this.world,
      element,
      markerPosition,
    );

    // Create Linkage Line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      meter.position,
      markerPosition,
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: LINE_COLOR,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.visible = this.markersVisible;
    this.world.scene.three.add(line);

    this.markerData.set(id, {
      element,
      position: markerPosition.clone(),
      line,
      markerId_internal,
    });
  }

  private updateMarkerContent(
    element: HTMLElement,
    meter: LiveFlowMeter,
  ): void {
    element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px; color: ${MARKER_COLOR}; font-size: 12px;">
        ${meter.name}
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #9ca3af;">Flow:</span>
        <span style="color: #4ade80; font-weight: bold;">
          ${meter.flowRate.toFixed(1)} L/min
        </span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #9ca3af;">Pressure:</span>
        <span style="color: #f87171; font-weight: bold;">
          ${meter.flowPressure.toFixed(2)} bar
        </span>
      </div>
    `;
  }

  private updateMarker(id: string): void {
    const meter = this.flowMeters.get(id);
    const markerData = this.markerData.get(id);
    if (!meter || !markerData) return;

    this.updateMarkerContent(markerData.element, meter);
  }

  getAllFlowMeters(): LiveFlowMeter[] {
    return Array.from(this.flowMeters.values());
  }

  isRunning(): boolean {
    return this.running;
  }

  getHistoricalData(meterId: string): HistoricalDataPoint[] {
    return this.historicalData.get(meterId) || [];
  }
}

export const liveIoTManager = new LiveIoTManager();
