import * as BUI from "@thatopen/ui";
import { LiveIoTManager } from "../../utils/LiveIoTManager";
import { createSmallChart } from "../../utils/charts/ChartRenderer";
import { calculateAnalytics } from "../../utils/analytics/AnalyticsCalculator";

interface IoTManagerState {
  iotManager: LiveIoTManager;
}

let _iotManager: LiveIoTManager;
let _selectedMeterId: string | null = null;

export const iotDashboardTemplate: BUI.StatefullComponent<IoTManagerState> = (
  state,
) => {
  _iotManager = state.iotManager;

  const meters = _iotManager.getAllFlowMeters();
  const running = _iotManager.isRunning();

  const isDark = document.documentElement.classList.contains("bim-ui-dark");
  const titleColor = isDark ? "#4ade80" : "#6528d7";

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
      ? meters.reduce((sum: number, m) => sum + m.flowRate, 0) / meters.length
      : 0;
  const avgPressure =
    meters.length > 0
      ? meters.reduce((sum: number, m) => sum + m.flowPressure, 0) /
        meters.length
      : 0;
  const onlineCount = meters.filter((m) => m.isOnline).length;

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px; height: 100%; overflow-y: auto; background: var(--bim-ui_bg-base);">
      
      <!-- Header Stats -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 16px; text-align: center; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
          <div style="font-size: 28px; font-weight: 700;">${onlineCount}</div>
          <div style="font-size: 10px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Online</div>
        </div>
        <div style="background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); border-radius: 12px; padding: 16px; text-align: center; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
          <div style="font-size: 28px; font-weight: 700;">${avgFlowRate.toFixed(0)}</div>
          <div style="font-size: 10px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Avg L/min</div>
        </div>
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 12px; padding: 16px; text-align: center; color: white; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
          <div style="font-size: 28px; font-weight: 700;">${avgPressure.toFixed(1)}</div>
          <div style="font-size: 10px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">bar</div>
        </div>
      </div>

      <!-- Controls -->
      <div style="display: flex; gap: 8px;">
        <bim-button 
          style="flex: 1;"
          label="${running ? "⏹ Stop Simulation" : "▶ Start Simulation"}"
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
        <div style="background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 12px; padding: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
          <div style="font-size: 13px; font-weight: 600; color: ${titleColor}; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
            ${selectedMeter.name}
          </div>
          
          <!-- Live Values -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: var(--bim-ui_bg-contrast-10); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid var(--bim-ui_bg-contrast-30);">
              <div style="font-size: 22px; font-weight: 700; color: #4ade80;">
                ${selectedMeter.flowRate.toFixed(1)}
              </div>
              <div style="font-size: 10px; color: var(--bim-ui_text-dim); text-transform: uppercase;">L/min</div>
            </div>
            <div style="background: var(--bim-ui_bg-contrast-10); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid var(--bim-ui_bg-contrast-30);">
              <div style="font-size: 22px; font-weight: 700; color: #f87171;">
                ${selectedMeter.flowPressure.toFixed(2)}
              </div>
              <div style="font-size: 10px; color: var(--bim-ui_text-dim); text-transform: uppercase;">bar</div>
            </div>
          </div>
          
          <!-- Analytics Indicators -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bim-ui_bg-contrast-10); border-radius: 6px;">
              <span style="color: var(--bim-ui_text-dim);">MA:</span>
              <span style="color: #60a5fa; font-weight: 600;">${analytics.ma.toFixed(1)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bim-ui_bg-contrast-10); border-radius: 6px;">
              <span style="color: var(--bim-ui_text-dim);">EMA:</span>
              <span style="color: #a78bfa; font-weight: 600;">${analytics.ema.toFixed(1)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bim-ui_bg-contrast-10); border-radius: 6px;">
              <span style="color: var(--bim-ui_text-dim);">Min:</span>
              <span style="color: #f87171; font-weight: 600;">${analytics.min.toFixed(1)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bim-ui_bg-contrast-10); border-radius: 6px;">
              <span style="color: var(--bim-ui_text-dim);">Max:</span>
              <span style="color: #4ade80; font-weight: 600;">${analytics.max.toFixed(1)}</span>
            </div>
          </div>
          
          <!-- Charts -->
          <div style="margin-bottom: 12px;">
            <div style="font-size: 10px; color: var(--bim-ui_text-dim); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Flow Rate History</div>
            ${createSmallChart(history, "flowRate")}
          </div>
          <div>
            <div style="font-size: 10px; color: var(--bim-ui_text-dim); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Pressure History</div>
            ${createSmallChart(history, "flowPressure")}
          </div>
        </div>
      `
          : ""
      }

      <!-- Meter List -->
      <div style="background: var(--bim-ui_bg-card); border: 1px solid var(--bim-ui_bg-contrast-40); border-radius: 12px; padding: 12px; max-height: 220px; overflow-y: auto; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
        <div style="font-size: 11px; color: var(--bim-ui_text-dim); padding: 8px; position: sticky; top: 0; background: var(--bim-ui_bg-card); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          Flow Meters (${meters.length})
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
        ${meters.map(
          (meter) => BUI.html`
          <div 
            style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; 
                   background: ${_selectedMeterId === meter.id ? "rgba(96, 165, 250, 0.15)" : "var(--bim-ui_bg-contrast-10)"}; 
                   border-radius: 8px; cursor: pointer; border: 1px solid ${_selectedMeterId === meter.id ? "#60a5fa" : "transparent"}; transition: all 0.2s;"
            @click=${() => {
              _selectedMeterId = meter.id;
            }}
          >
            <span style="font-size: 11px; color: var(--bim-ui_text-normal); font-weight: 500;">${meter.id}</span>
            <span style="font-size: 12px; font-weight: 700; color: ${meter.flowRate > 150 ? "#4ade80" : meter.flowRate > 80 ? "#fbbf24" : "#f87171"};">
              ${meter.flowRate.toFixed(0)} L/min
            </span>
          </div>
        `,
        )}
        </div>
      </div>
    </div>
  `;
};
