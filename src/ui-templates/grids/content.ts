import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "..";
import { CONTENT_GRID_GAP, CONTENT_GRID_ID } from "../../globals";
import { liveIoTManager } from "../../utils/LiveIoTManager";

type Viewer = "viewer";

type Combined = {
  name: "combined";
  state: TEMPLATES.CombinedPanelState;
};

type Analytics = {
  name: "analytics";
  state: TEMPLATES.AnalyticsManagerState;
};

type BimAnalytics = {
  name: "bimAnalytics";
  state: TEMPLATES.BimAnalyticsManagerState;
};

export type ContentGridElements = [Viewer, Combined, Analytics, BimAnalytics];

export type ContentGridLayouts = ["Viewer", "Analytics", "BimAnalytics"];

export interface ContentGridState {
  components: OBC.Components;
  world: OBC.World;
  id: string;
  viewportTemplate: BUI.StatelessComponent;
}

export const contentGridTemplate: BUI.StatefullComponent<ContentGridState> = (
  state,
) => {
  const { components, world } = state;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let currentLayout: ContentGridLayouts[number] = "Viewer";

  const defaultWidths: Record<ContentGridLayouts[number], number> = {
    Viewer: 25,
    Analytics: 60,
    BimAnalytics: 60,
  };

  const updateGridTemplate = (
    grid: BUI.Grid<ContentGridLayouts, ContentGridElements>,
    newRem: number,
  ) => {
    grid.layouts = {
      Viewer: {
        template: `"viewer combined" 1fr /1fr ${newRem}rem`,
      },
      Analytics: {
        template: `"viewer analytics" 1fr /1fr ${newRem}rem`,
      },
      BimAnalytics: {
        template: `"viewer bimAnalytics" 1fr /1fr ${newRem}rem`,
      },
    };
  };

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ContentGridLayouts, ContentGridElements>;

    grid.elements = {
      combined: {
        template: TEMPLATES.combinedPanelTemplate,
        initialState: { components, world },
      },
      analytics: {
        template: TEMPLATES.analyticsDashboardTemplate,
        initialState: { iotManager: liveIoTManager },
      },
      bimAnalytics: {
        template: TEMPLATES.bimAnalyticsDashboardTemplate,
        initialState: { iotManager: liveIoTManager },
      },
      viewer: state.viewportTemplate,
    };

    grid.layouts = {
      Viewer: {
        template: `"viewer combined" 1fr /1fr 25rem`,
      },
      Analytics: {
        template: `"viewer analytics" 1fr /1fr 60rem`,
      },
      BimAnalytics: {
        template: `"viewer bimAnalytics" 1fr /1fr 60rem`,
      },
    };

    grid.addEventListener("layoutchange", () => {
      const layout = grid.layout as ContentGridLayouts[number];
      if (
        layout &&
        (layout === "Viewer" ||
          layout === "Analytics" ||
          layout === "BimAnalytics")
      ) {
        currentLayout = layout;
      }
    });

    const resizer = document.createElement("div");
    resizer.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      background: transparent;
      z-index: 100;
    `;
    resizer.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      const panel = grid.querySelector('[style*="grid-column"]');
      if (panel) {
        const style = window.getComputedStyle(panel);
        startWidth = parseFloat(style.width) || defaultWidths[currentLayout];
      }
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const deltaX = e.clientX - startX;
      const deltaRem = deltaX / 16;
      const newWidth = Math.max(15, Math.min(80, startWidth + deltaRem));
      updateGridTemplate(grid, newWidth);
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
    });

    grid.style.position = "relative";
    grid.appendChild(resizer);
  };

  return BUI.html`
        <bim-grid id=${state.id} style="padding: ${CONTENT_GRID_GAP}; gap: ${CONTENT_GRID_GAP}" ${BUI.ref(onCreated)}></bim-grid>
    `;
};

export const getContentGrid = () => {
  const contentGrid = document.getElementById(CONTENT_GRID_ID) as BUI.Grid<
    ContentGridLayouts,
    ContentGridElements
  > | null;

  return contentGrid;
};
