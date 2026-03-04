import * as BUI from "@thatopen/ui";
import {
  LiveIoTManager,
  HistoricalDataPoint,
} from "../../utils/LiveIoTManager";

interface IoTManagerState {
  iotManager: LiveIoTManager;
}

let _iotManager: LiveIoTManager;
let _selectedMeterId: string | null = null;

function createChart(
  history: HistoricalDataPoint[],
  type: "flowRate" | "flowPressure",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 100;
  const ctx = canvas.getContext("2d")!;

  if (history.length < 2) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data yet", canvas.width / 2, canvas.height / 2);
    return canvas;
  }

  const values = history.map((h) => h[type]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 10;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  // Line
  const color = type === "flowRate" ? "#4ade80" : "#f87171";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < values.length; i++) {
    const x = padding + (i / (values.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((values[i] - min) / range) * chartHeight;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Fill
  ctx.lineTo(padding + chartWidth, padding + chartHeight);
  ctx.lineTo(padding, padding + chartHeight);
  ctx.closePath();
  ctx.fillStyle = color
    .replace(")", ", 0.1)")
    .replace("rgb", "rgba")
    .replace("#", "rgba(");
  ctx.globalAlpha = 0.2;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Labels
  ctx.fillStyle = "#9ca3af";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(max.toFixed(0), 2, padding + 8);
  ctx.fillText(min.toFixed(0), 2, canvas.height - 4);

  return canvas;
}

function calculateAnalytics(history: HistoricalDataPoint[]): {
  ma: number;
  ema: number;
  min: number;
  max: number;
  avg: number;
} {
  if (history.length === 0) {
    return { ma: 0, ema: 0, min: 0, max: 0, avg: 0 };
  }

  const values = history.map((h) => h.flowRate);

  // Moving Average (last 10)
  const ma =
    values.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, values.length);

  // EMA
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = 0.3 * values[i] + 0.7 * ema;
  }

  return {
    ma,
    ema,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

export const iotDashboardTemplate: BUI.StatefullComponent<IoTManagerState> = (
  state,
) => {
  _iotManager = state.iotManager;

  const meters = _iotManager.getAllFlowMeters();
  const running = _iotManager.isRunning();

  // Default to first meter if none selected
  if (!_selectedMeterId && meters.length > 0) {
    _selectedMeterId = meters[0].id;
  }

  const selectedMeter = _selectedMeterId
    ? meters.find((m) => m.id === _selectedMeterId)
    : null;
  const history = _selectedMeterId
    ? _iotManager.getHistoricalData(_selectedMeterId)
    : [];
  const analytics = calculateAnalytics(history);

  const avgFlowRate =
    meters.length > 0
      ? meters.reduce((sum: number, m: any) => sum + m.flowRate, 0) /
        meters.length
      : 0;
  const avgPressure =
    meters.length > 0
      ? meters.reduce((sum: number, m: any) => sum + m.flowPressure, 0) /
        meters.length
      : 0;
  const onlineCount = meters.filter((m: any) => m.isOnline).length;

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; height: 100%; overflow-y: auto;">
      
      <!-- Header Stats -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
        <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: #4ade80;">${onlineCount}</div>
          <div style="font-size: 8px; color: #9ca3af;">Online</div>
        </div>
        <div style="background: rgba(96, 165, 250, 0.1); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: #60a5fa;">${avgFlowRate.toFixed(0)}</div>
          <div style="font-size: 8px; color: #9ca3af;">Avg L/min</div>
        </div>
        <div style="background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: #f87171;">${avgPressure.toFixed(1)}</div>
          <div style="font-size: 8px; color: #9ca3af;">bar</div>
        </div>
      </div>

      <!-- Controls -->
      <div style="display: flex; gap: 6px;">
        <bim-button 
          style="flex: 1; font-size: 11px;"
          label="${running ? "⏹ Stop" : "▶ Start"}"
          @click=${() => {
            if (running) {
              _iotManager.stopSimulation();
            } else {
              _iotManager.startSimulation();
            }
          }}
        ></bim-button>
      </div>

      <!-- Selected Meter Chart & Analytics -->
      ${
        selectedMeter
          ? BUI.html`
        <div style="background: rgba(0,0,0,0.4); border-radius: 6px; padding: 8px;">
          <div style="font-size: 11px; font-weight: bold; color: #4a90d9; margin-bottom: 6px;">
            ${selectedMeter.name}
          </div>
          
          <!-- Live Values -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: rgba(0,0,0,0.5); padding: 6px; border-radius: 4px; text-align: center;">
              <div style="font-size: 14px; font-weight: bold; color: #4ade80;">
                ${selectedMeter.flowRate.toFixed(1)}
              </div>
              <div style="font-size: 7px; color: #9ca3af;">L/min</div>
            </div>
            <div style="background: rgba(0,0,0,0.5); padding: 6px; border-radius: 4px; text-align: center;">
              <div style="font-size: 14px; font-weight: bold; color: #f87171;">
                ${selectedMeter.flowPressure.toFixed(2)}
              </div>
              <div style="font-size: 7px; color: #9ca3af;">bar</div>
            </div>
          </div>
          
          <!-- Analytics Indicators -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-bottom: 8px; font-size: 9px;">
            <div style="display: flex; justify-content: space-between; color: #9ca3af;">
              <span>MA:</span>
              <span style="color: #60a5fa;">${analytics.ma.toFixed(1)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #9ca3af;">
              <span>EMA:</span>
              <span style="color: #a78bfa;">${analytics.ema.toFixed(1)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #9ca3af;">
              <span>Min:</span>
              <span style="color: #f87171;">${analytics.min.toFixed(1)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #9ca3af;">
              <span>Max:</span>
              <span style="color: #4ade80;">${analytics.max.toFixed(1)}</span>
            </div>
          </div>
          
          <!-- Charts -->
          <div style="margin-bottom: 6px;">
            <div style="font-size: 8px; color: #9ca3af; margin-bottom: 4px;">Flow Rate History</div>
            ${createChart(history, "flowRate")}
          </div>
          <div>
            <div style="font-size: 8px; color: #9ca3af; margin-bottom: 4px;">Pressure History</div>
            ${createChart(history, "flowPressure")}
          </div>
        </div>
      `
          : ""
      }

      <!-- Meter List -->
      <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px;">
        <div style="font-size: 9px; color: #9ca3af; padding: 4px; position: sticky; top: 0; background: inherit;">
          Flow Meters (${meters.length})
        </div>
        ${meters.map(
          (meter: any) => BUI.html`
          <div 
            style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; 
                   background: ${_selectedMeterId === meter.id ? "rgba(74, 144, 217, 0.2)" : "rgba(0,0,0,0.2)"}; 
                   border-radius: 4px; cursor: pointer; border: 1px solid ${_selectedMeterId === meter.id ? "#4a90d9" : "transparent"};"
            @click=${() => {
              _selectedMeterId = meter.id;
            }}
          >
            <span style="font-size: 10px; color: #d1d5db;">${meter.id}</span>
            <span style="font-size: 10px; color: ${meter.flowRate > 150 ? "#4ade80" : meter.flowRate > 80 ? "#fbbf24" : "#f87171"}; font-weight: bold;">
              ${meter.flowRate.toFixed(0)} L/min
            </span>
          </div>
        `,
        )}
      </div>
    </div>
  `;
};
