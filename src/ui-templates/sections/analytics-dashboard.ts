import * as BUI from "@thatopen/ui";
import { LiveIoTManager, LiveFlowMeter } from "../../utils/LiveIoTManager";
import Chart from "chart.js/auto";

export interface AnalyticsManagerState {
  iotManager: LiveIoTManager;
}

let _iotManager: LiveIoTManager;
let _charts: { [key: string]: Chart } = {};
let _globalHistory: { timestamp: number; totalFlow: number }[] = [];
let _analyticsIntervalId: ReturnType<typeof setInterval> | null = null;

// Expose charts to window for external access (e.g., resize handler)
(window as any)._analyticsCharts = _charts;

function calculateGlobalAnalytics(
  meters: LiveFlowMeter[],
  iotManager: LiveIoTManager,
) {
  let totalFlowRate = 0;
  let totalCumulativeVolume = 0;
  let onlineCount = 0;

  for (const meter of meters) {
    totalFlowRate += meter.flowRate;
    if (meter.isOnline) onlineCount++;

    const history = iotManager.getHistoricalData(meter.id);
    const meterVolume = history.reduce(
      (acc, curr) => acc + curr.flowRate * (5 / 60),
      0,
    );
    totalCumulativeVolume += meterVolume;
  }

  // Update global history for the trend chart
  const now = Date.now();
  const currentInterval = _iotManager.getUpdateInterval();
  if (
    _globalHistory.length === 0 ||
    now - _globalHistory[_globalHistory.length - 1].timestamp >= currentInterval
  ) {
    _globalHistory.push({ timestamp: now, totalFlow: totalFlowRate });
    if (_globalHistory.length > 50) _globalHistory.shift();
  }

  return {
    totalFlowRate,
    totalCumulativeVolume,
    onlineCount,
    totalCount: meters.length,
  };
}

export const analyticsDashboardTemplate: BUI.StatefullComponent<
  AnalyticsManagerState
> = (state, update) => {
  _iotManager = state.iotManager;
  const meters = _iotManager
    .getAllFlowMeters()
    .sort((a, b) => a.name.localeCompare(b.name));

  const globalAnalytics = calculateGlobalAnalytics(meters, _iotManager);

  const running = _iotManager.isRunning();
  const currentInterval = _iotManager.getUpdateInterval();

  if (running && !_analyticsIntervalId) {
    _analyticsIntervalId = setInterval(() => {
      update();
    }, currentInterval);
  } else if (!running && _analyticsIntervalId) {
    clearInterval(_analyticsIntervalId);
    _analyticsIntervalId = null;
  }

  const isDark = document.documentElement.classList.contains("bim-ui-dark");
  const titleColor = isDark ? "#4ade80" : "#6528d7";

  const initGlobalChart = (el: Element | undefined) => {
    const canvas = el as HTMLCanvasElement | null;
    if (!canvas) return;

    const chartKey = "global-running";

    // Always destroy existing chart first to avoid conflicts
    if (_charts[chartKey]) {
      try {
        _charts[chartKey].destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      delete _charts[chartKey];
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(96, 165, 250, 0.4)");
    gradient.addColorStop(1, "rgba(96, 165, 250, 0.0)");

    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    const textColor = isDark ? "#9ca3af" : "#6b7280";

    _charts[chartKey] = new Chart(canvas, {
      type: "line",
      data: {
        labels: _globalHistory.map((h) =>
          new Date(h.timestamp).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
        ),
        datasets: [
          {
            label: "Total Flow (L/min)",
            data: _globalHistory.map((h) => h.totalFlow),
            borderColor: "#60a5fa",
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 1.5,
            pointBackgroundColor: "#60a5fa",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        devicePixelRatio: window.devicePixelRatio,
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              font: { size: 10 },
            },
          },
          y: {
            type: "linear",
            display: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark
              ? "rgba(0,0,0,0.8)"
              : "rgba(255,255,255,0.9)",
            titleColor: "#60a5fa",
            bodyColor: isDark ? "white" : "#1f2937",
            borderColor: "#1e40af",
            borderWidth: 1,
            padding: 10,
          },
        },
      },
    });
  };

  return BUI.html`
    <div style="display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 16px; background: var(--bim-ui_bg-base); gap: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <h2 style="margin: 0; color: ${titleColor}; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; font-size: 14px;">DMA/PMA Analytics</h2>
        <div style="display: flex; align-items: center; gap: 12px;">
           <bim-button label="Refresh" icon="mdi:refresh" @click=${() => update()}></bim-button>
        </div>
      </div>

      ${
        !running
          ? BUI.html`
      <!-- Hint for users -->
      `
          : ""
      }
      
      <!-- Global Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; min-width: 0; flex-shrink: 0;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); border-radius: 8px; padding: 12px; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); min-width: 0;">
          <div style="font-size: 9px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Flow Rate</div>
          <div style="font-size: 18px; font-weight: 600;">${globalAnalytics.totalFlowRate.toFixed(1)} <span style="font-size: 10px; font-weight: 400; opacity: 0.7;">L/m</span></div>
          <div style="margin-top: 4px; display: flex; align-items: center; gap: 4px;">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: #4ade80;"></div>
            <span style="font-size: 9px; color: rgba(255,255,255,0.8);">${globalAnalytics.onlineCount}/${globalAnalytics.totalCount}</span>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%); border-radius: 8px; padding: 12px; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); min-width: 0;">
          <div style="font-size: 9px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Cumul. Vol</div>
          <div style="font-size: 18px; font-weight: 600;">${globalAnalytics.totalCumulativeVolume.toFixed(0)} <span style="font-size: 10px; font-weight: 400; opacity: 0.7;">L</span></div>
          <div style="margin-top: 4px; font-size: 9px; color: rgba(255,255,255,0.6);">Throughput</div>
        </div>

        <div style="background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 8px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); min-width: 0;">
          <div style="font-size: 9px; color: var(--bim-ui_text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Status</div>
          <div style="display: inline-flex; align-items: center; gap: 4px; background: ${isDark ? "rgba(74, 222, 128, 0.12)" : "rgba(22, 128, 61, 0.1)"}; border: 1px solid ${isDark ? "rgba(74, 222, 128, 0.3)" : "rgba(22, 128, 61, 0.25)"}; padding: 2px 8px; border-radius: 8px;">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: ${isDark ? "#4ade80" : "#15803d"};"></div>
            <span style="font-size: 10px; font-weight: 600; color: ${isDark ? "#4ade80" : "#15803d"};">OK</span>
          </div>
        </div>
      </div>

      <!-- Main Global Chart -->
      <div style="flex: 1; min-height: 0; background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 12px; padding: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); min-width: 0; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 4px; flex-shrink: 0;">
          <h4 style="margin: 0; color: var(--bim-ui_text-dim); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Network Trend</h4>
          <span style="font-size: 10px; color: #60a5fa; background: rgba(96,165,250,0.1); padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(96,165,250,0.2);">Global</span>
        </div>
        
        ${
          !running
            ? BUI.html`
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
            <div style="font-size: 11px; color: var(--bim-ui_text-dim); text-align: center;">
              <span 
                style="color: #60a5fa; cursor: pointer; text-decoration: underline;"
                @click=${() => {
                  _iotManager.setUpdateInterval(2000);
                  _iotManager.startSimulation();
                  update();
                }}
              >Start Live Simulation</span> to watch real-time trends
            </div>
          </div>
        `
            : BUI.html`
          <div style="flex: 1; min-height: 150px; position: relative; width: 100%;">
            <canvas ${BUI.ref(initGlobalChart)}></canvas>
          </div>
        `
        }
      </div>

      <!-- Diurnal Data Table -->
      <div style="flex-shrink: 0; max-height: 200px; background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 12px; padding: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; display: flex; flex-direction: column;">
        <h4 style="margin: 0 0 8px 0; color: var(--bim-ui_text-dim); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 0;">Diurnal Data</h4>
        <div style="overflow-y: auto;">
          <table style="width: 100%; text-align: left; border-collapse: separate; border-spacing: 0 8px; font-size: 13px; color: var(--bim-ui_text-normal);">
            <thead>
              <tr style="color: var(--bim-ui_text-dim); text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">
                <th style="padding: 12px 16px; font-weight: 600;">Timestamp</th>
                <th style="padding: 12px 16px; font-weight: 600;">Summed Flow Rate (L/min)</th>
                <th style="padding: 12px 16px; font-weight: 600;">Network Load</th>
                <th style="padding: 12px 16px; font-weight: 600;">Variance</th>
              </tr>
            </thead>
            <tbody>
              ${[..._globalHistory]
                .reverse()
                .slice(0, 10)
                .map((h) => {
                  const load = (h.totalFlow / (meters.length * 200)) * 100;
                  return BUI.html`
                  <tr style="background: var(--bim-ui_bg-contrast-10); transition: all 0.2s; border-radius: 8px;">
                    <td style="padding: 16px; border-radius: 8px 0 0 8px; border-left: 3px solid ${titleColor};">
                      ${new Date(h.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td style="padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 500; color: ${isDark ? "#4ade80" : "#16a34a"};">
                      ${h.totalFlow.toFixed(2)}
                    </td>
                    <td style="padding: 16px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; height: 8px; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; max-width: 100px; overflow: hidden;">
                          <div style="height: 100%; width: ${Math.min(100, load)}%; background: linear-gradient(90deg, ${load > 80 ? "#f87171" : "#60a5fa"}, ${load > 80 ? "#ef4444" : "#3b82f6"}); border-radius: 4px; transition: width 0.3s ease;"></div>
                        </div>
                        <span style="font-size: 11px; font-weight: 500; color: var(--bim-ui_text-dim); min-width: 40px;">${load.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td style="padding: 16px; border-radius: 0 8px 8px 0; color: var(--bim-ui_text-dim); font-size: 12px;">
                      ± ${(Math.random() * 5).toFixed(2)}
                    </td>
                  </tr>
                `;
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
};
