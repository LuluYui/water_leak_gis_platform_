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

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ContentGridLayouts, ContentGridElements>;

    // Create Resizer Element
    const resizerElement = document.createElement("div");
    resizerElement.className = "grid-resizer";
    resizerElement.style.cssText = `
      width: 100%;
      height: 100%;
      cursor: col-resize;
      background: var(--bim-ui_bg-contrast-40); /* Visual Line */
      transition: background 0.2s;
    `;
    resizerElement.onmouseover = () => {
      resizerElement.style.background = "var(--bim-ui_accent-base)"; // Highlight on hover
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
      Analytics: {
        template: `"viewer resizer analytics" 1fr /1fr 4px 60rem`,
      },
      BimAnalytics: {
        template: `"viewer resizer bimAnalytics" 1fr /1fr 4px 60rem`,
      },
    };

    // Wait for BUI to render the element, then attach listener
    const attachListener = () => {
      // Find the actual resizer element in the DOM
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
        // Retry if not rendered yet
        requestAnimationFrame(attachListener);
      }
    };
    requestAnimationFrame(attachListener);

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

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const deltaX = e.clientX - startX;
      const deltaRem = deltaX / 16;

      // Dragging Right (positive deltaX) -> Panel Shrinks (width decreases)
      // Dragging Left (negative deltaX) -> Panel Grows (width increases)
      const newWidth = Math.max(15, Math.min(80, startWidth - deltaRem));

      // Update layout
      grid.layouts = {
        Viewer: {
          template: `"viewer resizer combined" 1fr /1fr 4px ${newWidth}rem`,
        },
        Analytics: {
          template: `"viewer resizer analytics" 1fr /1fr 4px ${newWidth}rem`,
        },
        BimAnalytics: {
          template: `"viewer resizer bimAnalytics" 1fr /1fr 4px ${newWidth}rem`,
        },
      };

      // Fallback: Direct CSS update if grid.layouts doesn't update visually
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
