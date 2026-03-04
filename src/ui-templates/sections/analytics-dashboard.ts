import * as BUI from "@thatopen/ui";
import {
  LiveIoTManager,
  HistoricalDataPoint,
} from "../../utils/LiveIoTManager";
import Chart from "chart.js/auto";

export interface AnalyticsManagerState {
  iotManager: LiveIoTManager;
}

let _iotManager: LiveIoTManager;
let _selectedMeterId: string | null = null;
let _charts: { [key: string]: Chart } = {};

function calculateLeakIndicators(history: HistoricalDataPoint[]) {
  if (history.length === 0)
    return { mnf: 0, avg: 0, max: 0, isLeakLikely: false };
  const flows = history.map((h) => h.flowRate);

  // Minimum Night Flow (MNF) proxy - simply taking the minimum of the historical buffer for this demo
  const mnf = Math.min(...flows);
  const avg = flows.reduce((a, b) => a + b, 0) / flows.length;
  const max = Math.max(...flows);

  // Leak heuristic: if minimum flow never drops below a certain threshold (e.g. 50% of avg)
  const isLeakLikely = mnf > avg * 0.7 && avg > 10;

  return { mnf, avg, max, isLeakLikely };
}

export const analyticsDashboardTemplate: BUI.StatefullComponent<
  AnalyticsManagerState
> = (state, update) => {
  _iotManager = state.iotManager;
  const meters = _iotManager.getAllFlowMeters();

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

  const initLineChart = (el: Element | undefined) => {
    const canvas = el as HTMLCanvasElement | null;
    if (!canvas) return;
    if (_charts["line"]) _charts["line"].destroy();

    _charts["line"] = new Chart(canvas, {
      type: "line",
      data: {
        labels: history.map((_, i) => i.toString()),
        datasets: [
          {
            label: "Flow Rate (L/min)",
            data: history.map((h) => h.flowRate),
            borderColor: "#4ade80",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Pressure (bar)",
            data: history.map((h) => h.flowPressure),
            borderColor: "#f87171",
            tension: 0.4,
            fill: false,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
          y: { type: "linear", display: true, position: "left" },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            grid: { drawOnChartArea: false },
          },
        },
        plugins: { legend: { display: true, labels: { color: "white" } } },
      },
    });
  };

  const initPieChart = (el: Element | undefined) => {
    const canvas = el as HTMLCanvasElement | null;
    if (!canvas) return;
    if (_charts["pie"]) _charts["pie"].destroy();

    const online = meters.filter((m: any) => m.isOnline).length;
    const offline = meters.length - online;

    _charts["pie"] = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Online", "Offline"],
        datasets: [
          {
            data: [online, offline],
            backgroundColor: ["#4ade80", "#f87171"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "white" } } },
      },
    });
  };

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; height: 100%; overflow-y: auto; background: var(--bim-ui_bg-base);">
      <h2 style="margin: 0; color: white;">Water Leak Analytics</h2>
      
      <!-- Top Filters & Network Status -->
      <div style="display: flex; gap: 12px; height: 150px;">
        <div style="flex: 1; background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 12px; position: relative;">
          <h4 style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">Network Health</h4>
          <div style="position: relative; height: 100px;">
            <canvas ${BUI.ref(initPieChart)}></canvas>
          </div>
        </div>
        
        <div style="flex: 1; background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 12px;">
          <h4 style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">Select Flowmeter</h4>
          <select 
            style="width: 100%; padding: 8px; background: var(--bim-ui_bg-base); color: white; border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 4px;"
            @change=${(e: Event) => {
              _selectedMeterId = (e.target as HTMLSelectElement).value;
              update();
            }}
          >
            ${meters.map(
              (m: any) => BUI.html`
              <option value="${m.id}" ?selected=${m.id === _selectedMeterId}>${m.name} (${m.id})</option>
            `,
            )}
          </select>
          <div style="margin-top: 12px;">
            <bim-button label="Refresh Data" icon="mdi:refresh" @click=${() => update()}></bim-button>
          </div>
        </div>
      </div>

      <!-- Selected Meter Leak Analytics -->
      ${
        selectedMeter
          ? BUI.html`
        <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; color: white;">${selectedMeter.name} Analysis</h3>
            ${
              analytics.isLeakLikely
                ? BUI.html`<span style="background: rgba(248, 113, 113, 0.2); color: #f87171; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">⚠️ Leak Likely</span>`
                : BUI.html`<span style="background: rgba(74, 222, 128, 0.2); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">✅ Normal</span>`
            }
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; text-align: center;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Min Night Flow</div>
              <div style="font-size: 18px; font-weight: bold; color: ${analytics.mnf > analytics.avg * 0.7 ? "#f87171" : "#60a5fa"};">${analytics.mnf.toFixed(1)}</div>
              <div style="font-size: 10px; color: #6b7280;">L/min</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; text-align: center;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Avg Flow</div>
              <div style="font-size: 18px; font-weight: bold; color: white;">${analytics.avg.toFixed(1)}</div>
              <div style="font-size: 10px; color: #6b7280;">L/min</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; text-align: center;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Current Pressure</div>
              <div style="font-size: 18px; font-weight: bold; color: #a78bfa;">${selectedMeter.flowPressure.toFixed(2)}</div>
              <div style="font-size: 10px; color: #6b7280;">bar</div>
            </div>
          </div>

          <div style="height: 250px; position: relative;">
            <canvas ${BUI.ref(initLineChart)}></canvas>
          </div>
        </div>

        <!-- Data Table -->
        <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 16px; overflow-x: auto;">
          <h4 style="margin: 0 0 12px 0; color: #9ca3af;">Recent Data Points</h4>
          <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 12px; color: white;">
            <thead>
              <tr style="border-bottom: 1px solid var(--bim-ui_bg-contrast-40);">
                <th style="padding: 8px;">Time (-sec)</th>
                <th style="padding: 8px;">Flow Rate (L/min)</th>
                <th style="padding: 8px;">Pressure (bar)</th>
              </tr>
            </thead>
            <tbody>
              ${[...history]
                .reverse()
                .slice(0, 5)
                .map(
                  (h, i) => BUI.html`
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <td style="padding: 8px;">-${i}</td>
                  <td style="padding: 8px; color: #4ade80;">${h.flowRate.toFixed(2)}</td>
                  <td style="padding: 8px; color: #f87171;">${h.flowPressure.toFixed(2)}</td>
                </tr>
              `,
                )}
            </tbody>
          </table>
        </div>
      `
          : BUI.html`<div style="padding: 20px; text-align: center; color: #9ca3af;">Loading flowmeters...</div>`
      }
    </div>
  `;
};
