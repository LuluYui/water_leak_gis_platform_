import * as THREE from "three";
import { LiveFlowMeter } from "../../types";
import { MARKER_CONFIG, SIMULATION_CONFIG } from "../../config/appConfig";

export class SpriteMarkerRenderer {
  private markerOffset: THREE.Vector3;
  private textureCache: Map<
    string,
    {
      texture: THREE.CanvasTexture;
      flowRate: number;
      flowPressure: number;
      timestamp: number;
    }
  > = new Map();
  private readonly CACHE_TTL_MS = 2000;
  private readonly FLOW_CHANGE_THRESHOLD = 5;
  private readonly PRESSURE_CHANGE_THRESHOLD = 0.2;

  constructor() {
    this.markerOffset = SIMULATION_CONFIG.markerOffset;
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    const lines: string[] = [];
    const words = text.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  createMarkerTexture(meter: LiveFlowMeter): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;

    const bgColor = "rgba(0, 0, 0, 0.85)";
    const borderColor = MARKER_CONFIG.colors.marker;

    const RATE_HIGH = 150;
    const RATE_MED = 80;
    const RATE_LOW = 30;

    const getFlowRateColor = (rate: number) => {
      if (rate > RATE_HIGH) return "#ef4444";
      if (rate > RATE_MED) return "#fbbf24";
      if (rate < RATE_LOW) return "#60a5fa";
      return "#4ade80";
    };

    const getPressureColor = (pressure: number) => {
      if (pressure > 5) return "#ef4444";
      if (pressure < 2) return "#60a5fa";
      if (pressure > 4) return "#fbbf24";
      return "#4ade80";
    };

    const flowColor = getFlowRateColor(meter.flowRate);
    const pressureColor = getPressureColor(meter.flowPressure);

    ctx.fillStyle = bgColor;
    ctx.roundRect(2, 2, 196, 96, 8);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = borderColor;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    const titleText = meter.localId
      ? `${meter.name} (#${meter.localId})`
      : meter.name;
    const titleLines = this.wrapText(ctx, titleText, 180);
    let titleY = 18;
    for (const line of titleLines) {
      ctx.fillText(line, 100, titleY);
      titleY += 14;
    }

    const dataStartY = titleY + 6;
    const labelX = 15;
    const valueX = 185;

    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#d1d5db";
    ctx.fillText(`Flow:`, labelX, dataStartY);
    ctx.textAlign = "right";
    ctx.fillStyle = flowColor;
    ctx.fillText(`${meter.flowRate.toFixed(0)} L/m`, valueX, dataStartY);

    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#d1d5db";
    ctx.fillText(`Pressure:`, labelX, dataStartY + 16);
    ctx.textAlign = "right";
    ctx.fillStyle = pressureColor;
    ctx.fillText(
      `${meter.flowPressure.toFixed(1)} bar`,
      valueX,
      dataStartY + 16,
    );

    return new THREE.CanvasTexture(canvas);
  }

  createSprite(meter: LiveFlowMeter): THREE.Sprite {
    const texture = this.createMarkerTexture(meter);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6.25, 3.125, 1);
    sprite.position.copy(meter.position).add(this.markerOffset);
    sprite.userData = { meterId: meter.id, texture };
    return sprite;
  }

  createTextSprite(text: string, color: string = "#fffff"): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 256;
    canvas.height = 64;

    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(8, 2, 1);
    return sprite;
  }

  updateSpritePosition(sprite: THREE.Sprite, meter: LiveFlowMeter): void {
    sprite.position.copy(meter.position).add(this.markerOffset);
  }

  updateSpriteTexture(sprite: THREE.Sprite, meter: LiveFlowMeter): void {
    const cached = this.textureCache.get(meter.id);
    const now = Date.now();

    const hasSignificantChange =
      !cached ||
      Math.abs(meter.flowRate - cached.flowRate) > this.FLOW_CHANGE_THRESHOLD ||
      Math.abs(meter.flowPressure - cached.flowPressure) >
        this.PRESSURE_CHANGE_THRESHOLD ||
      now - cached.timestamp > this.CACHE_TTL_MS;

    if (!hasSignificantChange) {
      return;
    }

    const oldTexture = sprite.material.map;
    const newTexture = this.createMarkerTexture(meter);
    (sprite.material as THREE.SpriteMaterial).map = newTexture;
    (sprite.material as THREE.SpriteMaterial).needsUpdate = true;
    if (oldTexture) oldTexture.dispose();

    this.textureCache.set(meter.id, {
      texture: newTexture,
      flowRate: meter.flowRate,
      flowPressure: meter.flowPressure,
      timestamp: now,
    });
  }

  createLinkageLine(
    meterPosition: THREE.Vector3,
    markerPosition: THREE.Vector3,
  ): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      meterPosition,
      markerPosition,
    ]);
    const material = new THREE.LineBasicMaterial({
      color: MARKER_CONFIG.colors.line,
      transparent: true,
      opacity: 0.6,
    });
    return new THREE.Line(geometry, material);
  }

  updateLine(
    line: THREE.Line,
    meterPosition: THREE.Vector3,
    markerPosition: THREE.Vector3,
  ): void {
    const positions = line.geometry.attributes.position;
    positions.setXYZ(0, meterPosition.x, meterPosition.y, meterPosition.z);
    positions.setXYZ(1, markerPosition.x, markerPosition.y, markerPosition.z);
    positions.needsUpdate = true;
  }
}
