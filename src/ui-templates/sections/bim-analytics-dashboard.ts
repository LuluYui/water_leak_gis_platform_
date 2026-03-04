import * as BUI from "@thatopen/ui";
import { LiveIoTManager, HistoricalDataPoint } from "../../utils/LiveIoTManager";
import { appIcons } from "../../globals";

export interface BimAnalyticsManagerState {
  iotManager: LiveIoTManager;
}

let _iotManager: LiveIoTManager;
let _selectedMeterId: string | null = null;
let _refreshKey = 0;

function calculateLeakIndicators(history: HistoricalDataPoint[]) {
  if (history.length === 0) return { mnf: 0, avg: 0, max: 0, isLeakLikely: false };
  const flows = history.map(h => h.flowRate);
  
  const mnf = Math.min(...flows);
  const avg = flows.reduce((a, b) => a + b, 0) / flows.length;
  const max = Math.max(...flows);
  
  const isLeakLikely = (mnf > avg * 0.7) && avg > 10;
  
  return { mnf, avg, max, isLeakLikely };
}

function createChart(
  history: HistoricalDataPoint[],
  type: "flowRate" | "flowPressure",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 150;
  const ctx = canvas.getContext("2d")!;

  if (history.length < 2) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Insufficient data for chart", canvas.width / 2, canvas.height / 2);
    return canvas;
  }

  const values = history.map((h) => h[type]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 15;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  // Background
  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
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
  ctx.fillStyle = color.replace(")", ", 0.1)").replace("rgb", "rgba").replace("#", "rgba(");
  ctx.globalAlpha = 0.2;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Labels
  ctx.fillStyle = "#9ca3af";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(max.toFixed(1), 2, padding + 8);
  ctx.fillText(min.toFixed(1), 2, canvas.height - 4);

  return canvas;
}

export const bimAnalyticsDashboardTemplate: BUI.StatefullComponent<BimAnalyticsManagerState> = (state, update) => {
  _iotManager = state.iotManager;
  const meters = _iotManager.getAllFlowMeters();
  
  if (!_selectedMeterId && meters.length > 0) {
    _selectedMeterId = meters[0].id;
  }

  const selectedMeter = _selectedMeterId ? meters.find(m => m.id === _selectedMeterId) : null;
  const history = _selectedMeterId ? _iotManager.getHistoricalData(_selectedMeterId) : [];
  const analytics = calculateLeakIndicators(history);

  const onMeterChange = (e: Event) => {
    const dropdown = e.target as BUI.Dropdown;
    _selectedMeterId = dropdown.value[0] as string;
    _refreshKey++;
    update();
  };

  const createDataTable = () => {
    const table = document.createElement("bim-table") as BUI.Table;
    table.headersHidden = false;
    table.data = [...history].reverse().slice(0, 10).map((h, i) => ({
      data: {
        Time: `-${i}s`,
        "Flow Rate": h.flowRate.toFixed(2),
        "Pressure": h.flowPressure.toFixed(2)
      }
    }));
    return table;
  };

  return BUI.html`
    <bim-panel>
      <bim-panel-section label="Water Leak Analytics (Native UI)" icon=${appIcons.CHART}>
        
        <bim-dropdown @change=${onMeterChange}>
          <bim-option label="Select Flowmeter" value="" disabled></bim-option>
          ${meters.map((m: any) => BUI.html`
            <bim-option label="${m.name} (${m.id})" value="${m.id}" ?checked=${m.id === _selectedMeterId}></bim-option>
          `)}
        </bim-dropdown>

        <bim-button label="Refresh Data" icon="mdi:refresh" @click=${() => update()}></bim-button>

      </bim-panel-section>

      ${selectedMeter ? BUI.html`
        <bim-panel-section label="${selectedMeter.name} Analysis" icon=${appIcons.TASK}>
          
          <div style="padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--bim-ui_text-normal); font-size: 14px;">Status</span>
            ${analytics.isLeakLikely 
              ? BUI.html`<bim-label style="color: #f87171; font-weight: bold;">⚠️ Leak Likely</bim-label>`
              : BUI.html`<bim-label style="color: #4ade80; font-weight: bold;">✅ Normal</bim-label>`
            }
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 10px 10px;">
            <div style="background: var(--bim-ui_bg-contrast-20); padding: 10px; border-radius: 4px; text-align: center;">
              <div style="font-size: 12px; color: var(--bim-ui_text-dim);">Min Night Flow</div>
              <div style="font-size: 16px; font-weight: bold; color: ${analytics.mnf > analytics.avg * 0.7 ? '#f87171' : '#60a5fa'};">
                ${analytics.mnf.toFixed(1)} <span style="font-size: 10px;">L/min</span>
              </div>
            </div>
            <div style="background: var(--bim-ui_bg-contrast-20); padding: 10px; border-radius: 4px; text-align: center;">
              <div style="font-size: 12px; color: var(--bim-ui_text-dim);">Avg Flow</div>
              <div style="font-size: 16px; font-weight: bold; color: white;">
                ${analytics.avg.toFixed(1)} <span style="font-size: 10px;">L/min</span>
              </div>
            </div>
          </div>

          <div style="padding: 0 10px 10px;">
            <div style="font-size: 12px; color: var(--bim-ui_text-dim); margin-bottom: 5px;">Flow Rate (L/min)</div>
            <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 4px; padding: 5px; display: flex; justify-content: center;">
              ${createChart(history, "flowRate")}
            </div>
          </div>

          <div style="padding: 0 10px 10px;">
            <div style="font-size: 12px; color: var(--bim-ui_text-dim); margin-bottom: 5px;">Pressure (bar)</div>
            <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 4px; padding: 5px; display: flex; justify-content: center;">
              ${createChart(history, "flowPressure")}
            </div>
          </div>

        </bim-panel-section>

        <bim-panel-section label="Recent Data Points" icon="solar:history-bold">
          <div style="padding: 0 10px 10px; max-height: 250px; overflow-y: auto;">
            ${createDataTable()}
          </div>
        </bim-panel-section>
      ` : BUI.html`<bim-panel-section label="Loading..." icon=${appIcons.SEARCH}></bim-panel-section>`}
    </bim-panel>
  `;
};