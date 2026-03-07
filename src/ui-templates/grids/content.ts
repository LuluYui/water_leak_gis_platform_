import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "..";
import { CONTENT_GRID_GAP, CONTENT_GRID_ID } from "../../globals";
import { liveIoTManager } from "../../utils/LiveIoTManager";

type Viewer = "viewer";
type Resizer = "resizer";

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

export type ContentGridElements = [
  Viewer,
  Resizer,
  Combined,
  Analytics,
  BimAnalytics,
];

export type ContentGridLayouts = [
  "Viewer",
  "DMA/PMA Dashboard",
  "BimAnalytics",
];

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
    "DMA/PMA Dashboard": 60,
    BimAnalytics: 60,
  };

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ContentGridLayouts, ContentGridElements>;

    const resizerElement = document.createElement("div");
    resizerElement.className = "grid-resizer";
    resizerElement.style.cssText = `
      width: 100%;
      height: 100%;
      cursor: col-resize;
      background: var(--bim-ui_bg-contrast-40);
      transition: background 0.2s;
    `;
    resizerElement.onmouseover = () => {
      resizerElement.style.background = "var(--bim-ui_accent-base)";
    };
    resizerElement.onmouseout = () => {
      resizerElement.style.background = "var(--bim-ui_bg-contrast-40)";
    };

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
        initialState: { iotManager: liveIoTManager, components },
      },
      viewer: state.viewportTemplate,
      resizer: () => BUI.html`${resizerElement}`,
    };

    grid.layouts = {
      Viewer: {
        template: `"viewer resizer combined" 1fr /1fr 4px 25rem`,
      },
      "DMA/PMA Dashboard": {
        template: `"viewer resizer analytics" 1fr /1fr 4px 60rem`,
      },
      BimAnalytics: {
        template: `"viewer resizer bimAnalytics" 1fr /1fr 4px 60rem`,
      },
    };

    const attachListener = () => {
      const renderedResizer = grid.querySelector(".grid-resizer");
      if (renderedResizer) {
        renderedResizer.addEventListener("mousedown", (e: Event) => {
          isResizing = true;
          startX = (e as MouseEvent).clientX;
          const template = grid.layouts[currentLayout]?.template;
          const match = template?.match(/([\d.]+)rem$/);
          if (match) {
            startWidth = parseFloat(match[1]);
          } else {
            startWidth = defaultWidths[currentLayout];
          }
          e.preventDefault();
          e.stopPropagation();
        });
      } else {
        requestAnimationFrame(attachListener);
      }
    };
    requestAnimationFrame(attachListener);

    grid.addEventListener("layoutchange", () => {
      const layout = grid.layout as ContentGridLayouts[number];
      if (
        layout &&
        (layout === "Viewer" ||
          layout === "DMA/PMA Dashboard" ||
          layout === "BimAnalytics")
      ) {
        currentLayout = layout;
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const deltaX = e.clientX - startX;
      const deltaRem = deltaX / 16;

      const newWidth = Math.max(15, Math.min(80, startWidth - deltaRem));

      grid.layouts = {
        Viewer: {
          template: `"viewer resizer combined" 1fr /1fr 4px ${newWidth}rem`,
        },
        "DMA/PMA Dashboard": {
          template: `"viewer resizer analytics" 1fr /1fr 4px ${newWidth}rem`,
        },
        BimAnalytics: {
          template: `"viewer resizer bimAnalytics" 1fr /1fr 4px ${newWidth}rem`,
        },
      };

      const gridElement = grid;
      if (gridElement) {
        gridElement.style.gridTemplateColumns = `1fr 4px ${newWidth}rem`;
      }
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
    });
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
