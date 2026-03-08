import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { LiveIoTManager } from "../../utils/LiveIoTManager";
import { appIcons } from "../../globals";
import { createLargeChart } from "../../utils/charts/ChartRenderer";
import { calculateLeakIndicators } from "../../utils/analytics/AnalyticsCalculator";

export interface BimAnalyticsManagerState {
  iotManager: LiveIoTManager;
  components?: OBC.Components;
  selectedElementId?: string | null;
}

let _iotManager: LiveIoTManager;
let _selectedMeterId: string | null = null;
let _refreshKey = 0;
let _components: OBC.Components | null = null;
let _bimAnalyticsIntervalId: ReturnType<typeof setInterval> | null = null;

export const bimAnalyticsDashboardTemplate: BUI.StatefullComponent<
  BimAnalyticsManagerState
> = (state, update) => {
  _iotManager = state.iotManager;
  _components = state.components || null;

  const running = _iotManager.isRunning();
  const currentInterval = _iotManager.getUpdateInterval();

  if (running && !_bimAnalyticsIntervalId) {
    _bimAnalyticsIntervalId = setInterval(() => {
      update();
    }, currentInterval);
  } else if (!running && _bimAnalyticsIntervalId) {
    clearInterval(_bimAnalyticsIntervalId);
    _bimAnalyticsIntervalId = null;
  }

  if (state.components) {
    const highlighter = state.components.get(OBF.Highlighter);
    if (highlighter && highlighter.events.select) {
      highlighter.events.select.onHighlight.add((modelIdMap) => {
        const modelId = Object.keys(modelIdMap)[0];
        if (modelId) {
          const localIds = modelIdMap[modelId];
          if (localIds && localIds.size > 0) {
            const firstLocalId = Array.from(localIds)[0];
            const targetId = `${modelId}-${firstLocalId}`;

            const meterExists = _iotManager
              .getAllFlowMeters()
              .some((m) => m.id === targetId);
            if (meterExists) {
              _selectedMeterId = targetId;
              update();
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

    if (_selectedMeterId && _components) {
      const parts = _selectedMeterId.split("-");
      const modelId = parts.slice(0, -1).join("-");
      const localId = parseInt(parts[parts.length - 1]);

      if (!isNaN(localId)) {
        (async () => {
          try {
            const highlighter = _components!.get(OBF.Highlighter);
            const fragments = _components!.get(OBC.FragmentsManager);
            const model = fragments.list.get(modelId);

            if (model && highlighter) {
              await highlighter.highlightByID(
                "select",
                { [modelId]: new Set([localId]) },
                false,
                false,
              );
            }
          } catch (err) {
            console.warn("Failed to highlight element:", err);
          }
        })();
      }
    }

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
        
        <!-- Active Meter Indicator - Always Visible -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px; color: white; text-align: center; border: 1px solid #60a5fa; flex-shrink: 0;">
          <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Active Flow Meter</div>
          <div style="font-size: 16px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
            ${selectedMeter ? `${selectedMeter.name} (${selectedMeter.id})` : "No Selection"}
          </div>
        </div>

        <bim-dropdown @change=${onMeterChange} style="margin-bottom: 8px; flex-shrink: 0;">
          <bim-option label="Select Flowmeter" value="" disabled></bim-option>
          ${meters.map(
            (m) => BUI.html`
            <bim-option label="${m.name} (${m.id})" value="${m.id}" ?checked=${m.id === _selectedMeterId}></bim-option>
          `,
          )}
        </bim-dropdown>

        <bim-button label="Refresh" icon="mdi:refresh" @click=${() => update()} style="flex-shrink: 0;"></bim-button>

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

        <!-- Charts in same row -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 10px 10px;">
            <div>
              <div style="font-size: 14px; color: var(--bim-ui_text-dim); margin-bottom: 8px; font-weight: 600;">Flow Rate (L/min)</div>
              <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 8px; min-height: 200px;">
                ${createLargeChart(history, "flowRate")}
              </div>
            </div>
            <div>
              <div style="font-size: 14px; color: var(--bim-ui_text-dim); margin-bottom: 8px; font-weight: 600;">Pressure (bar)</div>
              <div style="background: var(--bim-ui_bg-contrast-20); border-radius: 8px; padding: 8px; min-height: 200px;">
                ${createLargeChart(history, "flowPressure")}
              </div>
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
          : BUI.html`
          <bim-panel-section label="Loading..." icon=${appIcons.SEARCH}>
            <div style="text-align: center; padding: 20px;">
              ${
                !running
                  ? BUI.html`
                <bim-button label="Start Live Simulation" icon="mdi:play" @click=${() => {
                  _iotManager.setUpdateInterval(2000);
                  _iotManager.startSimulation();
                  update();
                }} style="background: #4ade80; color: #000; font-size: 16px; padding: 12px 24px;"></bim-button>
                <div style="font-size: 12px; color: var(--bim-ui_text-dim); margin-top: 16px; background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; border: 1px dashed #60a5fa;">
                  💡 Tip: Click the button above to start the simulation. You can then select flow meters from the dropdown or click on 3D elements to view details.
                </div>
              `
                  : BUI.html`<div style="font-size: 14px; color: #4ade80;">✅ Simulation Active</div>`
              }
            </div>
          </bim-panel-section>`
      }
    </bim-panel>
  `;
};
