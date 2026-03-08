import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import { defaultLeakConfig, LeakPointConfig } from "../config/leakConfig";
import { SimpleEventEmitter } from "../core/SimpleEventEmitter";
import {
  LiveFlowMeter,
  HistoricalDataPoint,
  FlowMeterMarkerData,
} from "../types";
import { SimulationController } from "./io/SimulationController";
import { MarkerRenderer } from "./io/MarkerRenderer";
import { SpriteMarkerRenderer } from "./io/SpriteMarkerRenderer";
import { SIMULATION_CONFIG } from "../config/appConfig";

export type FlowMeterUpdateCallback = (meter: LiveFlowMeter) => void;
export type MarkerMode = "dom" | "sprite";

export type {
  HistoricalDataPoint,
  LiveFlowMeter,
  FlowMeterMarkerData,
  LeakPointConfig,
} from "../types";

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
  private maxHistoryPoints: number = SIMULATION_CONFIG.maxHistoryPoints;

  private simulationController: SimulationController;
  private markerRenderer: MarkerRenderer;
  private spriteRenderer: SpriteMarkerRenderer;

  public markersVisible: boolean = true;
  private allMarkerElements: HTMLElement[] = [];
  private autoClusterOriginallyEnabled: boolean = true;

  private leakConfig: LeakPointConfig[] = defaultLeakConfig;
  private meterLeakMap: Map<string, LeakPointConfig[]> = new Map();

  private markerMode: MarkerMode = "sprite";
  private markerUpdateThrottleMs: number = 1000;
  private lastMarkerUpdate: Map<string, number> = new Map();
  private spriteGroup: THREE.Group | null = null;

  constructor() {
    super();
    this.simulationController = new SimulationController();
    this.markerRenderer = new MarkerRenderer();
    this.spriteRenderer = new SpriteMarkerRenderer();
  }

  public setMarkerMode(mode: MarkerMode): void {
    if (this.markerMode === mode) return;

    const wasRunning = this.simulationController.isRunning();
    if (wasRunning) this.stopSimulation();

    this.markerMode = mode;

    if (this.flowMeters.size > 0) {
      this.clearMarkers();
      this.createMarkers();
    }

    if (wasRunning) this.startSimulation();
  }

  public getMarkerMode(): MarkerMode {
    return this.markerMode;
  }

  public setMarkerUpdateThrottle(ms: number): void {
    this.markerUpdateThrottleMs = ms;
  }

  public getMarkerUpdateThrottle(): number {
    return this.markerUpdateThrottleMs;
  }

  public setUpdateInterval(ms: number): void {
    this.simulationController.setUpdateInterval(ms);
    if (this.simulationController.isRunning()) {
      this.stopSimulation();
      if (ms > 0) {
        this.startSimulation();
      }
    } else if (ms > 0) {
      this.startSimulation();
    }
  }

  public getUpdateInterval(): number {
    return this.simulationController.getUpdateInterval();
  }

  public setLeakActive(leakId: string, isActive: boolean): void {
    const leak = this.leakConfig.find((l) => l.id === leakId);
    if (leak) {
      leak.isActive = isActive;
      console.log(
        `Leak ${leak.name} is now ${isActive ? "ACTIVE" : "INACTIVE"}`,
      );
    }
  }

  public getLeakConfig(): LeakPointConfig[] {
    return this.leakConfig;
  }

  public toggleLeak(leakId: string): void {
    const leak = this.leakConfig.find((l) => l.id === leakId);
    if (leak) {
      this.setLeakActive(leakId, !leak.isActive);
    }
  }

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
      (this.markerComponent as unknown as { autoCluster: boolean })
        .autoCluster !== false;
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
    this.meterLeakMap.clear();

    for (const ifcMeter of ifcMeters) {
      const id = `${ifcMeter.modelId}-${ifcMeter.localId}`;

      const baseFlowRate = this.simulationController.calculateBaseFlowRate();
      const basePressure = this.simulationController.calculateBasePressure();

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
        baseFlowRate: baseFlowRate,
      };

      const associatedLeaks: LeakPointConfig[] = [];
      for (const leak of this.leakConfig) {
        if (leak.isActive) {
          for (const elemId of leak.elementIds) {
            if (
              ifcMeter.name.includes(elemId) ||
              elemId.includes(ifcMeter.name)
            ) {
              associatedLeaks.push(leak);
              break;
            }
          }
        }
      }
      this.meterLeakMap.set(id, associatedLeaks);

      this.flowMeters.set(id, flowMeter);
    }
  }

  startSimulation(): void {
    this.simulationController.start(() => this.updateSimulationData());
  }

  stopSimulation(): void {
    this.simulationController.stop();
  }

  toggleMarkersVisibility(): void {
    this.markersVisible = !this.markersVisible;
    this.applyVisibilityToAll();
    this.emit("visibilityChanged", this.markersVisible);
  }

  private applyVisibilityToAll(): void {
    if (!this.world || !this.markerComponent) return;

    this.markerComponent.enabled = this.markersVisible;

    const markerAny = this.markerComponent as unknown as {
      autoCluster: boolean;
      cluster: (
        world: OBC.SimpleWorld<
          OBC.SimpleScene,
          OBC.OrthoPerspectiveCamera,
          OBF.PostproductionRenderer
        > | null,
      ) => void;
    };

    if (!this.markersVisible) {
      markerAny.autoCluster = false;
      this.hideAllClusterElements();
    } else {
      markerAny.autoCluster = this.autoClusterOriginallyEnabled;
      this.showAllClusterElements();
      this.triggerClustering();
    }

    if (this.markerMode === "sprite" && this.spriteGroup) {
      this.spriteGroup.visible = this.markersVisible;
    } else {
      for (const [, data] of this.markerData) {
        if (data.element) {
          data.element.style.display = this.markersVisible ? "block" : "none";
        }
        if (data.line) {
          data.line.visible = this.markersVisible;
        }
      }
    }
  }

  private hideAllClusterElements(): void {
    const viewport = document.querySelector("bim-viewport");
    if (!viewport) return;

    this.allMarkerElements = [];

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
        this.allMarkerElements.push(htmlEl);
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
          if (!this.allMarkerElements.includes(htmlSpan)) {
            this.allMarkerElements.push(htmlSpan);
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
            if (!this.allMarkerElements.includes(parentHtml)) {
              this.allMarkerElements.push(parentHtml);
            }
          } else {
            htmlDiv.style.setProperty("display", "none", "important");
            if (!this.allMarkerElements.includes(htmlDiv)) {
              this.allMarkerElements.push(htmlDiv);
            }
          }
        }
      }
    }

    try {
      const markerAny = this.markerComponent as unknown as {
        _clusters: unknown[];
        clusterLabels: unknown[];
      };
      if (markerAny._clusters) {
        markerAny._clusters.forEach((cluster: unknown) => {
          const c = cluster as {
            label?: { three?: { element?: HTMLElement } };
          };
          if (c.label?.three?.element) {
            const el = c.label.three.element;
            el.style.setProperty("display", "none", "important");
            if (el.parentElement) {
              el.parentElement.style.setProperty(
                "display",
                "none",
                "important",
              );
              if (!this.allMarkerElements.includes(el.parentElement)) {
                this.allMarkerElements.push(el.parentElement);
              }
            }
          }
        });
      }
      if (markerAny.clusterLabels) {
        markerAny.clusterLabels.forEach((cluster: unknown) => {
          const c = cluster as {
            label?: { three?: { element?: HTMLElement } };
          };
          if (c?.label?.three?.element) {
            const el = c.label.three.element;
            el.style.setProperty("display", "none", "important");
            if (el.parentElement) {
              el.parentElement.style.setProperty(
                "display",
                "none",
                "important",
              );
              if (!this.allMarkerElements.includes(el.parentElement)) {
                this.allMarkerElements.push(el.parentElement);
              }
            }
          }
        });
      }
    } catch {
      // Ignore errors accessing internal marker properties
    }
  }

  private showAllClusterElements(): void {
    for (const el of this.allMarkerElements) {
      el.style.removeProperty("display");
    }
  }

  private triggerClustering(): void {
    if (!this.markersVisible || !this.world || !this.markerComponent) return;

    try {
      type WorldType = OBC.SimpleWorld<
        OBC.SimpleScene,
        OBC.OrthoPerspectiveCamera,
        OBF.PostproductionRenderer
      >;
      (
        this.markerComponent as unknown as {
          cluster: (world: WorldType | null) => void;
        }
      ).cluster(this.world);
    } catch {
      // Clustering may fail if no markers exist yet
    }
  }

  clearAllClusterElements(): void {
    this.allMarkerElements = [];
  }

  private shouldUpdateMarker(meterId: string): boolean {
    const now = Date.now();
    const lastUpdate = this.lastMarkerUpdate.get(meterId) || 0;
    return now - lastUpdate >= this.markerUpdateThrottleMs;
  }

  private markMarkerUpdated(meterId: string): void {
    this.lastMarkerUpdate.set(meterId, Date.now());
  }

  clearMarkers(): void {
    if (this.markerMode === "sprite" && this.spriteGroup && this.world) {
      this.world.scene.three.remove(this.spriteGroup);
      this.spriteGroup = null;
    }

    if (this.markerMode === "dom") {
      for (const [, data] of this.markerData) {
        if (data.line) {
          this.world?.scene.three.remove(data.line);
        }
        if (data.element?.parentNode) {
          data.element.parentNode.removeChild(data.element);
        }
      }
    }

    this.markerData.clear();
    this.allMarkerElements = [];
    this.lastMarkerUpdate.clear();
  }

  private updateSimulationData(): void {
    if (!this.world) return;

    for (const [id, meter] of this.flowMeters) {
      const leaks = this.meterLeakMap.get(id) || [];

      this.simulationController.updateMeterData(
        meter,
        leaks,
        this.maxHistoryPoints,
        this.historicalData,
      );

      this.updateMarker(id);
      this.emit("flowMeterUpdate", meter);
    }
    this.emit("updateCycleComplete", Array.from(this.flowMeters.values()));
  }

  createMarkers(): void {
    if (!this.world) return;

    this.clearMarkers();

    if (this.markerMode === "sprite") {
      this.createSpriteMarkers();
    } else {
      if (!this.markerComponent) return;
      this.createDOMMarkers();
    }
  }

  private createDOMMarkers(): void {
    if (!this.world || !this.markerComponent) return;

    this.clearAllClusterElements();
    this.allMarkerElements = [];

    for (const [id, meter] of this.flowMeters) {
      const element = this.markerRenderer.createMarkerElement(
        meter,
        this.markersVisible,
      );
      this.allMarkerElements.push(element);

      const markerPosition = this.markerRenderer.getMarkerPosition(meter);

      const markerIdInternal = this.markerComponent.create(
        this.world,
        element,
        markerPosition,
      );

      const line = this.markerRenderer.createLinkageLine(
        meter.position,
        markerPosition,
        this.markersVisible,
      );
      this.world.scene.three.add(line);

      this.markerData.set(id, {
        element,
        position: markerPosition.clone(),
        line,
        markerIdInternal,
      });
    }

    if (this.markersVisible) {
      this.triggerClustering();
    }
  }

  private createSpriteMarkers(): void {
    if (!this.world) return;

    this.spriteGroup = new THREE.Group();

    for (const [id, meter] of this.flowMeters) {
      const sprite = this.spriteRenderer.createSprite(meter);
      sprite.visible = this.markersVisible;
      this.spriteGroup.add(sprite);

      const line = this.spriteRenderer.createLinkageLine(
        meter.position,
        sprite.position,
      );
      line.visible = this.markersVisible;
      this.spriteGroup.add(line);

      this.markerData.set(id, {
        element: null as unknown as HTMLElement,
        position: sprite.position.clone(),
        line,
        markerIdInternal: null,
        sprite,
      });
    }

    this.world.scene.three.add(this.spriteGroup);
  }

  private updateMarker(id: string): void {
    const meter = this.flowMeters.get(id);
    const markerData = this.markerData.get(id);
    if (!meter || !markerData) return;

    if (this.markerMode === "sprite") {
      this.updateSpriteMarker(id, meter, markerData);
    } else {
      this.updateDOMMarker(id, meter, markerData);
    }
  }

  private shouldThrottleUpdate(meterId: string): boolean {
    if (this.markerMode === "sprite") return false;
    if (!this.shouldUpdateMarker(meterId)) return true;
    this.markMarkerUpdated(meterId);
    return false;
  }

  private updateDOMMarker(
    id: string,
    meter: LiveFlowMeter,
    markerData: FlowMeterMarkerData,
  ): void {
    if (this.shouldThrottleUpdate(id)) return;
    this.markerRenderer.updateMarkerContent(markerData.element, meter);
  }

  private updateSpriteMarker(
    _id: string,
    meter: LiveFlowMeter,
    markerData: FlowMeterMarkerData,
  ): void {
    const sprite = markerData.sprite;
    if (sprite && sprite.position) {
      this.spriteRenderer.updateSpritePosition(sprite, meter);
      if (this.shouldUpdateMarker(_id)) {
        this.spriteRenderer.updateSpriteTexture(sprite, meter);
      }
    }
    if (markerData.line) {
      const markerPosition = meter.position
        .clone()
        .add(SIMULATION_CONFIG.markerOffset);
      this.spriteRenderer.updateLine(
        markerData.line,
        meter.position,
        markerPosition,
      );
    }
  }

  getAllFlowMeters(): LiveFlowMeter[] {
    return Array.from(this.flowMeters.values());
  }

  isRunning(): boolean {
    return this.simulationController.isRunning();
  }

  getHistoricalData(meterId: string): HistoricalDataPoint[] {
    return this.historicalData.get(meterId) || [];
  }
}

export const liveIoTManager = new LiveIoTManager();
