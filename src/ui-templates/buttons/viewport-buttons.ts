import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { appIcons, tooltips } from "../../globals";
import { liveIoTManager } from "../../utils/LiveIoTManager";

export interface ViewportButtonsState {
  components: OBC.Components;
}

const MIN_INTERVAL_MS = 100;
const MAX_INTERVAL_MS = 5000;
const SLIDER_MAX = 100;

const sliderToInterval = (sliderValue: number): number => {
  if (sliderValue === 0) return 0;
  const normalized = sliderValue / SLIDER_MAX;
  const logMin = Math.log(MIN_INTERVAL_MS);
  const logMax = Math.log(MAX_INTERVAL_MS);
  const logValue = logMin + normalized * (logMax - logMin);
  return Math.round(Math.exp(logValue));
};

const intervalToSlider = (intervalMs: number): number => {
  if (intervalMs === 0) return 0;
  if (intervalMs >= MAX_INTERVAL_MS) return SLIDER_MAX;
  if (intervalMs <= MIN_INTERVAL_MS) return 1;
  const logMin = Math.log(MIN_INTERVAL_MS);
  const logMax = Math.log(MAX_INTERVAL_MS);
  const logValue = Math.log(intervalMs);
  return Math.round(((logValue - logMin) / (logMax - logMin)) * SLIDER_MAX);
};

const formatInterval = (ms: number): string => {
  if (ms === 0) return "Off";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
};

let _isFilterVisible = true;
let _isSimulationMenuOpen = false;

export const viewportButtonsTemplate: BUI.StatefullComponent<
  ViewportButtonsState
> = (state, update) => {
  const { components } = state;
  const highlighter = components.get(OBF.Highlighter);
  const lengthMeasurer = components.get(OBF.LengthMeasurement);
  const areaMeasurer = components.get(OBF.AreaMeasurement);
  const clipper = components.get(OBC.Clipper);
  const grids = components.get(OBC.Grids);

  const areMeasurementsEnabled = lengthMeasurer.enabled || areaMeasurer.enabled;

  const disableAll = (exceptions?: ("clipper" | "length" | "area")[]) => {
    BUI.ContextMenu.removeMenus();
    highlighter.clear("select");
    highlighter.enabled = false;
    if (!exceptions?.includes("length")) lengthMeasurer.enabled = false;
    if (!exceptions?.includes("area")) areaMeasurer.enabled = false;
    if (!exceptions?.includes("clipper")) clipper.enabled = false;
  };

  const onLengthMeasurement = () => {
    disableAll(["length"]);
    lengthMeasurer.enabled = !lengthMeasurer.enabled;
    highlighter.enabled = !lengthMeasurer.enabled;
    update();
  };

  const onAreaMeasurement = () => {
    disableAll(["area"]);
    areaMeasurer.enabled = !areaMeasurer.enabled;
    highlighter.enabled = !areaMeasurer.enabled;
    update();
  };

  const onModelSection = () => {
    disableAll(["clipper"]);
    clipper.enabled = !clipper.enabled;
    highlighter.enabled = !clipper.enabled;
    update();
  };

  const isMarkersVisible = liveIoTManager.markersVisible;

  const onToggleMarkers = () => {
    liveIoTManager.toggleMarkersVisibility();
    update();
  };

  let isGridVisible = true;
  for (const [_id, grid] of grids.list) {
    isGridVisible = grid.visible;
    break;
  }

  const onToggleGrid = () => {
    for (const [_id, grid] of grids.list) {
      grid.visible = !grid.visible;
    }
    update();
  };

  const onToggleFilter = () => {
    _isFilterVisible = !_isFilterVisible;
    const finderPanel = document.querySelector(
      "bim-panel-section[label='Filter']",
    ) as HTMLElement;
    if (finderPanel) {
      finderPanel.style.display = _isFilterVisible ? "flex" : "none";
    }
    update();
  };

  const onMeasurementsClick = () => {
    lengthMeasurer.enabled = false;
    areaMeasurer.enabled = false;
    update();
  };

  const onToggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("bim-ui-dark")) {
      html.classList.remove("bim-ui-dark");
      html.classList.add("bim-ui-light");
    } else {
      html.classList.remove("bim-ui-light");
      html.classList.add("bim-ui-dark");
    }
  };

  const currentIntervalMs = liveIoTManager.getUpdateInterval();
  const currentSliderValue = intervalToSlider(currentIntervalMs);
  const isSimulationRunning = currentIntervalMs > 0;

  const onSimulationChange = ({ target }: { target: HTMLInputElement }) => {
    const sliderValue = parseInt(target.value);
    const newInterval = sliderToInterval(sliderValue);
    liveIoTManager.setUpdateInterval(newInterval);
    update();
  };

  const onToggleSimulationMenu = () => {
    _isSimulationMenuOpen = !_isSimulationMenuOpen;
    update();
  };

  return BUI.html`
    <bim-toolbar style="align-self: start; justify-self: start; margin: 1rem;" vertical>
      <bim-toolbar-section>
        <bim-button @click=${onMeasurementsClick} ?active=${areMeasurementsEnabled} label="Measurements" tooltip-title="Measurements" icon=${appIcons.RULER}>
          <bim-context-menu>
            <bim-button ?active=${lengthMeasurer.enabled} label="Length" @click=${onLengthMeasurement}></bim-button>
            <bim-button ?active=${areaMeasurer.enabled} label="Area" @click=${onAreaMeasurement}></bim-button>
          </bim-context-menu>
        </bim-button>
        <bim-button ?active=${clipper.enabled} @click=${onModelSection} label="Section" tooltip-title="Model Section" icon=${appIcons.CLIPPING}></bim-button>
        <bim-button ?active=${isMarkersVisible} @click=${onToggleMarkers} label="Markers" tooltip-title=${tooltips.MARKERS.TITLE} icon=${appIcons.MARKER}></bim-button>
        <bim-button ?active=${isGridVisible} @click=${onToggleGrid} label="Grid" tooltip-title=${tooltips.GRID.TITLE} icon=${appIcons.GRID}></bim-button>
        <bim-button ?active=${_isFilterVisible} @click=${onToggleFilter} label="Filter" tooltip-title=${tooltips.FILTER.TITLE} icon=${appIcons.SEARCH}></bim-button>
        <bim-button ?active=${_isSimulationMenuOpen} @click=${onToggleSimulationMenu} label="Simulation" tooltip-title=${tooltips.SIMULATION.TITLE} tooltip-text=${tooltips.SIMULATION.TEXT} icon=${appIcons.SIMULATION}>
          <bim-context-menu ?active=${_isSimulationMenuOpen} style="min-width: 220px; padding: 8px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <span style="font-size: 12px; color: var(--bim-ui_text-normal, #ccc);">Interval:</span>
                <span style="font-size: 14px; font-weight: bold; color: var(--bim-ui_accent-base, #6528d7);">${formatInterval(currentIntervalMs)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="${SLIDER_MAX}" 
                step="1" 
                .value=${currentSliderValue} 
                @input=${onSimulationChange} 
                style="width: 100%; cursor: pointer;"
              >
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #888;">
                <span>Off</span>
                <span>5s</span>
                <span>100ms</span>
              </div>
            </div>
          </bim-context-menu>
        </bim-button>
        <bim-button label="Settings" @click=${onToggleTheme} tooltip-title="Toggle Theme" icon=${appIcons.DARK}></bim-button> 
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
