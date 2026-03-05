import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import {
  LiveIoTManager,
  HistoricalDataPoint,
} from "../../utils/LiveIoTManager";
import { appIcons } from "../../globals";

export interface BimAnalyticsManagerState {
  iotManager: LiveIoTManager;
  components?: OBC.Components; // Needed for Highlighter access
  selectedElementId?: string | null; // Digital Twin: ID of the selected 3D element
}

let _iotManager: LiveIoTManager;
let _selectedMeterId: string | null = null;
let _refreshKey = 0;

function calculateLeakIndicators(history: HistoricalDataPoint[]) {
  if (history.length === 0)
    return { mnf: 0, avg: 0, max: 0, isLeakLikely: false };
  const flows = history.map((h) => h.flowRate);

  const mnf = Math.min(...flows);
  const avg = flows.reduce((a, b) => a + b, 0) / flows.length;
  const max = Math.max(...flows);

  const isLeakLikely = mnf > avg * 0.7 && avg > 10;

  return { mnf, avg, max, isLeakLikely };
}

function createChart(
  history: HistoricalDataPoint[],
  type: "flowRate" | "flowPressure",
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "180px";

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 300;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const tooltip = document.createElement("div");
  tooltip.style.cssText = `
    position: absolute;
    display: none;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 10;
    border: 1px solid #555;
  `;
  container.appendChild(tooltip);

  const ctx = canvas.getContext("2d")!;

  const draw = () => {
    const width = canvas.width;
    const height = canvas.height;

    if (history.length < 2) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Insufficient data for chart", width / 2, height / 2);
      return;
    }

    const values = history.map((h) => h[type]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = 25;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Line
    const color = type === "flowRate" ? "#4ade80" : "#f87171";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i < values.length; i++) {
      const x = padding + (i / (values.length - 1)) * chartWidth;
      const y =
        padding + chartHeight - ((values[i] - min) / range) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(max.toFixed(1), padding, padding + 15);
    ctx.fillText(min.toFixed(1), padding, height - 10);
  };

  // Add hover interaction
  canvas.onmousemove = (e) => {
    if (history.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const padding = 25;
    const chartWidth = canvas.width - padding * 2;

    const index = Math.round(
      ((x - padding) / chartWidth) * (history.length - 1),
    );
    if (index >= 0 && index < history.length) {
      const point = history[index];

      tooltip.style.display = "block";
      tooltip.style.left = `${e.clientX - rect.left + 10}px`;
      tooltip.style.top = `${e.clientY - rect.top - 30}px`;

      const time = new Date(point.timestamp).toLocaleTimeString();
      const value =
        type === "flowRate"
          ? point.flowRate.toFixed(1)
          : point.flowPressure.toFixed(2);
      const unit = type === "flowRate" ? "L/min" : "bar";
      tooltip.innerHTML = `<strong>${time}</strong><br/>${value} ${unit}`;
    }
  };

  canvas.onmouseout = () => {
    tooltip.style.display = "none";
  };

  draw();
  return container;
}

export const bimAnalyticsDashboardTemplate: BUI.StatefullComponent<
  BimAnalyticsManagerState
> = (state, update) => {
  _iotManager = state.iotManager;

  // Digital Twin: Setup Highlighter Listener for Auto-Selection
  if (state.components) {
    const highlighter = state.components.get(OBF.Highlighter);
    if (highlighter && highlighter.events.select) {
      highlighter.events.select.onHighlight.add((modelIdMap) => {
        // Find the first selected item
        const modelId = Object.keys(modelIdMap)[0];
        if (modelId) {
          const localIds = modelIdMap[modelId];
          if (localIds && localIds.size > 0) {
            // Construct the meter ID (format: modelId-localId)
            // localIds is a Set, get the first value
            const firstLocalId = Array.from(localIds)[0];
            const targetId = `${modelId}-${firstLocalId}`;

            // Check if this ID exists in our meters
            const meterExists = _iotManager
              .getAllFlowMeters()
              .some((m) => m.id === targetId);
            if (meterExists) {
              _selectedMeterId = targetId;
              update(); // Refresh UI
            }
          }
        }
      });
    }
  }

  const meters = _iotManager
    .getAllFlowMeters()
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!_selectedMeterId && meters.length > 0) {
    _selectedMeterId = meters[0].id;
  }

  const selectedMeter = _selectedMeterId
    ? meters.find((m) => m.id === _selectedMeterId)
    : null;
  const history = _selectedMeterId
    ? _iotManager.getHistoricalData(_selectedMeterId)
    : [];
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
    table.data = [...history]
      .reverse()
      .slice(0, 10)
      .map((h, i) => ({
        data: {
          Time: `-${i}s`,
          "Flow Rate": h.flowRate.toFixed(2),
          Pressure: h.flowPressure.toFixed(2),
        },
      }));
    return table;
  };

  return BUI.html`
    <bim-panel>
      <bim-panel-section label="Water Leak Analytics (Native UI)" icon=${appIcons.CHART}>
        
        <!-- Active Meter Indicator -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; color: white; text-align: center; border: 1px solid #60a5fa;">
          <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Active Flow Meter</div>
          <div style="font-size: 16px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
            ${selectedMeter ? `${selectedMeter.name} (${selectedMeter.id})` : "No Selection"}
          </div>
        </div>

        <bim-dropdown @change=${onMeterChange} style="margin-bottom: 8px;">
          <bim-option label="Select Flowmeter" value="" disabled></bim-option>
          ${meters.map(
            (m: any) => BUI.html`
            <bim-option label="${m.name} (${m.id})" value="${m.id}" ?checked=${m.id === _selectedMeterId}></bim-option>
          `,
          )}
        </bim-dropdown>

        <bim-button label="Refresh Data" icon="mdi:refresh" @click=${() => update()}></bim-button>

      </bim-panel-section>

      ${
        selectedMeter
          ? BUI.html`
        <bim-panel-section label="${selectedMeter.name} (${selectedMeter.id}) Analysis" icon=${appIcons.TASK}>
         
         <div style="padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--bim-ui_text-normal); font-size: 16px; font-weight: 600;">Analysis Status</span>
            ${
              analytics.isLeakLikely
                ? BUI.html`<bim-label style="color: #f87171; font-weight: bold; font-size: 16px;">⚠️ LEAK DETECTED</bim-label>`
                : BUI.html`<bim-label style="color: #4ade80; font-weight: bold; font-size: 16px;">✅ NORMAL</bim-label>`
            }
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 10px 12px;">
            <div style="background: var(--bim-ui_bg-contrast-20); padding: 16px; border-radius: 8px; text-align: center; border: 1px solid var(--bim-ui_bg-contrast-40);">
              <div style="font-size: 14px; color: var(--bim-ui_text-dim); font-weight: 600; margin-bottom: 8px;">Min Night Flow</div>
              <div style="font-size: 24px; font-weight: bold; color: ${analytics.mnf > analytics.avg * 0.7 ? "#f87171" : "#60a5fa"};">
                ${analytics.mnf.toFixed(1)} <span style="font-size: 12px;">L/min</span>
              </div>
            </div>
            <div style="background: var(--bim-ui_bg-contrast-20); padding: 16px; border-radius: 8px; text-align: center; border: 1px solid var(--bim-ui_bg-contrast-40);">
              <div style="font-size: 14px; color: var(--bim-ui_text-dim); font-weight: 600; margin-bottom: 8px;">Avg Flow</div>
              <div style="font-size: 24px; font-weight: bold; color: var(--bim-ui_text-normal);">
                ${analytics.avg.toFixed(1)} <span style="font-size: 12px;">L/min</span>
              </div>
            </div>
        </div>

        <div style="padding: 0 10px 10px;">
            <div style="font-size: 14px; color: var(--bim-ui_text-dim); margin-bottom: 8px; font-weight: 600;">Flow Rate (L/min)</div>
            <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 8px;">
              ${createChart(history, "flowRate")}
            </div>
        </div>

        <div style="padding: 0 10px 10px;">
            <div style="font-size: 14px; color: var(--bim-ui_text-dim); margin-bottom: 8px; font-weight: 600;">Pressure (bar)</div>
            <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 8px;">
              ${createChart(history, "flowPressure")}
            </div>
        </div>

      </bim-panel-section>

        <bim-panel-section label="Recent Data Points" icon="solar:history-bold">
              <div style="padding: 0 10px 10px;
              max-height: 150px; overflow-y: auto;">
            ${createDataTable()}
          </div>
        </bim-panel-section>
      `
          : BUI.html`<bim-panel-section label="Loading..." icon=${appIcons.SEARCH}></bim-panel-section>`
      }
    </bim-panel>
  `;
};
