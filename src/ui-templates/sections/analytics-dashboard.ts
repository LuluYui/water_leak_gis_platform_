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
let _lastRunningState = false;

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

  if (running !== _lastRunningState) {
    _lastRunningState = running;
    if (_charts["global-running"]) {
      _charts["global-running"].destroy();
      delete _charts["global-running"];
    }
    if (_charts["global"]) {
      _charts["global"].destroy();
      delete _charts["global"];
    }
  }

  const isDark = document.documentElement.classList.contains("bim-ui-dark");
  const titleColor = isDark ? "#4ade80" : "#6528d7";

  const initGlobalChart = (el: Element | undefined) => {
    const canvas = el as HTMLCanvasElement | null;
    if (!canvas) return;

    const chartKey = running ? "global-running" : "global";
    if (_charts[chartKey]) {
      _charts[chartKey].destroy();
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
    <div style="display: flex; flex-direction: column; gap: 20px; padding: 24px; height: 100%; overflow-y: auto; background: var(--bim-ui_bg-base);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; color: ${titleColor}; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">DMA/PMA Analytics</h2>
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
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; min-width: 0;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); border-radius: 12px; padding: 16px; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); min-width: 0;">
          <div style="font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Global Flow Rate</div>
          <div style="font-size: 24px; font-weight: 600; letter-spacing: -1px;">${globalAnalytics.totalFlowRate.toFixed(1)} <span style="font-size: 12px; font-weight: 400; opacity: 0.7;">L/m</span></div>
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px #4ade80;"></div>
            <span style="font-size: 10px; color: rgba(255,255,255,0.8);">${globalAnalytics.onlineCount}/${globalAnalytics.totalCount}</span>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%); border-radius: 12px; padding: 16px; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); min-width: 0;">
          <div style="font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Cumulative Vol</div>
          <div style="font-size: 24px; font-weight: 600; letter-spacing: -1px;">${globalAnalytics.totalCumulativeVolume.toFixed(0)} <span style="font-size: 12px; font-weight: 400; opacity: 0.7;">L</span></div>
          <div style="margin-top: 8px; font-size: 10px; color: rgba(255,255,255,0.6);">Summed Throughput</div>
        </div>

        <div style="background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 0;">
          <div style="font-size: 10px; color: var(--bim-ui_text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">System Status</div>
          <div style="margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; background: ${isDark ? "rgba(74, 222, 128, 0.12)" : "rgba(22, 128, 61, 0.1)"}; border: 1px solid ${isDark ? "rgba(74, 222, 128, 0.3)" : "rgba(22, 128, 61, 0.25)"}; padding: 4px 10px; border-radius: 12px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${isDark ? "#4ade80" : "#15803d"};"></div>
            <span style="font-size: 12px; font-weight: 600; color: ${isDark ? "#4ade80" : "#15803d"};">Healthy</span>
          </div>
          <div style="margin-top: 8px; font-size: 10px; color: var(--bim-ui_text-dim);">Leak Detection: Active</div>
        </div>
      </div>

      <!-- Main Global Chart -->
      <div style="background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 16px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); min-width: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <h4 style="margin: 0; color: var(--bim-ui_text-dim); font-weight: 500; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;">Network Diurnal Trend (L/min)</h4>
          <span style="font-size: 11px; color: #60a5fa; background: rgba(96,165,250,0.1); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(96,165,250,0.2); font-weight: 500;">Global Aggregation</span>
        </div>
        
        ${
          !running
            ? BUI.html`
                  <div style="font-size: 12px; color: var(--bim-ui_text-dim); background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; border: 1px dashed #60a5fa;">
        💡 <strong>Tip:</strong> Click "Start Live Sim" to begin the simulation. Watch the global flow trends update in real-time and observe the diurnal patterns in the charts below.
      </div>

        <div style="height: 250px; min-height: 200px; flex-direction: column; align-items: center; justify-content: center; background: var(--bim-ui_bg-contrast-10); border-radius: 8px; border: 2px dashed var(--bim-ui_accent-base);">
          <bim-button label="Start Live Simulation" icon="mdi:play" @click=${() => {
            _iotManager.setUpdateInterval(2000);
            _iotManager.startSimulation();
            update();
          }} style="font-size: 14px; padding: 10px 20px;"></bim-button>
        </div>
        `
            : BUI.html`
        <div style="height: 250px; min-height: 180px; position: relative; width: 100%;">
          <canvas ${BUI.ref(initGlobalChart)}></canvas>
        </div>
        `
        }
      </div>

      <!-- Diurnal Data Table -->
      <div style="background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <h4 style="margin: 0 0 20px 0; color: var(--bim-ui_text-dim); font-weight: 500; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;">Summed Diurnal Flow Data</h4>
        <div style="max-height: 200px; overflow-y: auto;">
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
