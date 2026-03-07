import * as THREE from "three";
import { LiveFlowMeter } from "../../types";
import { MARKER_CONFIG, SIMULATION_CONFIG } from "../../config/appConfig";

export class SpriteMarkerRenderer {
  private spriteMaterial: THREE.SpriteMaterial;
  private markerOffset: THREE.Vector3;
  private canvas: HTMLCanvasElement;

  constructor() {
    this.markerOffset = SIMULATION_CONFIG.markerOffset;
    this.canvas = this.createMarkerCanvas("#4a90d9");
    const texture = new THREE.CanvasTexture(this.canvas);
    this.spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  }

  private createMarkerCanvas(color: string): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();

    return canvas;
  }

  createSprite(meter: LiveFlowMeter): THREE.Sprite {
    const sprite = new THREE.Sprite(this.spriteMaterial.clone());
    sprite.scale.set(3, 3, 1);
    sprite.position.copy(meter.position).add(this.markerOffset);
    sprite.userData = { meterId: meter.id };
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
