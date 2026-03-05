import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { appIcons, tooltips } from "../../globals";
import { liveIoTManager } from "../../utils/LiveIoTManager";

export interface ViewportButtonsState {
  components: OBC.Components;
}

let _isFilterVisible = true;

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
        <bim-button label="Settings" @click=${onToggleTheme} tooltip-title="Settings" icon=${appIcons.DARK}></bim-button> 
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
