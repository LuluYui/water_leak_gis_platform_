import * as THREE from "three";
import { LiveFlowMeter } from "../../types";
import { MARKER_CONFIG, SIMULATION_CONFIG } from "../../config/appConfig";

export class SpriteMarkerRenderer {
  private markerOffset: THREE.Vector3;

  constructor() {
    this.markerOffset = SIMULATION_CONFIG.markerOffset;
  }

  createMarkerTexture(meter: LiveFlowMeter): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;

    const bgColor = "rgba(0, 0, 0, 0.85)";
    const borderColor = MARKER_CONFIG.colors.marker;
    const flowColor =
      meter.flowRate > 150
        ? MARKER_CONFIG.colors.flowRate
        : meter.flowRate > 80
          ? "#fbbf24"
          : MARKER_CONFIG.colors.pressure;

    ctx.fillStyle = bgColor;
    ctx.roundRect(2, 2, 124, 76, 8);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = borderColor;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(meter.name.substring(0, 12), 64, 20);

    ctx.fillStyle = flowColor;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`${meter.flowRate.toFixed(0)} L/m`, 64, 45);

    ctx.fillStyle = MARKER_CONFIG.colors.pressure;
    ctx.font = "12px sans-serif";
    ctx.fillText(`${meter.flowPressure.toFixed(1)} bar`, 64, 65);

    return new THREE.CanvasTexture(canvas);
  }

  createSprite(meter: LiveFlowMeter): THREE.Sprite {
    const texture = this.createMarkerTexture(meter);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2.5, 1);
    sprite.position.copy(meter.position).add(this.markerOffset);
    sprite.userData = { meterId: meter.id, texture };
    return sprite;
  }

  createTextSprite(text: string, color: string = "#ffffff"): THREE.Sprite {
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
    const oldTexture = sprite.material.map;
    const newTexture = this.createMarkerTexture(meter);
    (sprite.material as THREE.SpriteMaterial).map = newTexture;
    (sprite.material as THREE.SpriteMaterial).needsUpdate = true;
    if (oldTexture) oldTexture.dispose();
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
