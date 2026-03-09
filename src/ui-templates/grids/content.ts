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
  "Tools",
];

export interface ContentGridState {
  components: OBC.Components;
  world: OBC.World;
  id: string;
  viewportTemplate: BUI.StatelessComponent;
}

const MOBILE_BREAKPOINT = 768;

const getMobileState = () => window.innerWidth < MOBILE_BREAKPOINT;

export const contentGridTemplate: BUI.StatefullComponent<ContentGridState> = (
  state,
) => {
  const { components, world } = state;

  let isResizing = false;
  let isTouchResizing = false;
  let startX = 0;
  let startWidth = 0;
  let currentLayout: ContentGridLayouts[number] = "Viewer";

  const defaultWidths: Record<ContentGridLayouts[number], number> = {
    Viewer: 25,
    "DMA/PMA Dashboard": 60,
    BimAnalytics: 60,
    Tools: 60,
  };

  const getRightPanelOpen = () => {
    const grid = document.getElementById(state.id);
    return grid?.dataset.rightPanelOpen === "true";
  };

  const setRightPanelOpen = (open: boolean) => {
    const grid = document.getElementById(state.id);
    if (grid) {
      grid.dataset.rightPanelOpen = open ? "true" : "false";
    }
  };

  const updateMobilePanel = () => {
    const isMobile = getMobileState();
    const rightPanelOpen = getRightPanelOpen();
    const rightPanel = document.querySelector(
      '[name="combined"], [name="analytics"], [name="bimAnalytics"], [slot="combined"], [slot="analytics"], [slot="bimAnalytics"]',
    ) as HTMLElement;
    const resizer = document.querySelector(".grid-resizer") as HTMLElement;
    const toggleBtn = document.getElementById("mobile-panel-toggle");
    const grid = document.getElementById(state.id) as BUI.Grid<
      ContentGridLayouts,
      ContentGridElements
    >;

    if (!grid) return;

    const mobileLayouts = {
      Viewer: {
        template: `"viewer" 1fr /1fr`,
      },
      "DMA/PMA Dashboard": {
        template: `"analytics" 1fr /1fr`,
      },
      BimAnalytics: {
        template: `"bimAnalytics" 1fr /1fr`,
      },
      Tools: {
        template: `"combined" 1fr /1fr`,
      },
    };

    const desktopLayouts = {
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

    // Handle layout switch when crossing breakpoint
    const currentLayout = grid.layout as string;
    let needsLayoutSwitch = false;
    let newLayout: ContentGridLayouts[number] =
      currentLayout as ContentGridLayouts[number];

    if (!isMobile && currentLayout === "Tools") {
      newLayout = "Viewer";
      needsLayoutSwitch = true;
    }

    if (isMobile) {
      if (resizer) {
        resizer.style.display = rightPanelOpen ? "block" : "none";
      }
      if (toggleBtn) {
        toggleBtn.style.display = "flex";
      }
      grid.layouts = mobileLayouts;
      // If current layout doesn't exist in mobile layouts, switch to default
      if (!mobileLayouts[currentLayout as keyof typeof mobileLayouts]) {
        newLayout = "Viewer";
        needsLayoutSwitch = true;
      }
      if (rightPanel) {
        if (rightPanelOpen) {
          rightPanel.classList.add("mobile-panel-open");
        } else {
          rightPanel.classList.remove("mobile-panel-open");
        }
      }
    } else {
      if (resizer) {
        resizer.style.display = "block";
      }
      if (toggleBtn) {
        toggleBtn.style.display = "none";
      }
      grid.layouts = desktopLayouts as any;
      if (rightPanel) {
        rightPanel.classList.remove("mobile-panel-open");
      }
    }

    // Actually switch the layout if needed - this mimics clicking the sidebar button
    if (needsLayoutSwitch) {
      grid.layout = newLayout;
    }
  };

  const toggleMobilePanel = () => {
    const current = getRightPanelOpen();
    setRightPanelOpen(!current);
    updateMobilePanel();
  };

  (window as any).toggleMobilePanel = toggleMobilePanel;

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

    const desktopLayouts = {
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

    const mobileLayouts = {
      Viewer: {
        template: `"viewer" 1fr /1fr`,
      },
      "DMA/PMA Dashboard": {
        template: `"analytics" 1fr /1fr`,
      },
      BimAnalytics: {
        template: `"bimAnalytics" 1fr /1fr`,
      },
      Tools: {
        template: `"combined" 1fr /1fr`,
      },
    };

    const isMobile = getMobileState();
    grid.layouts = (isMobile ? mobileLayouts : desktopLayouts) as any;

    setTimeout(() => {
      const rightPanel = document.querySelector(
        '[name="combined"], [name="analytics"], [name="bimAnalytics"]',
      ) as HTMLElement;
      if (rightPanel) {
        rightPanel.classList.add("right-panel");
      }
      updateMobilePanel();
    }, 100);

    const attachListener = () => {
      const renderedResizer = grid.querySelector(".grid-resizer");
      if (renderedResizer) {
        renderedResizer.addEventListener("mousedown", (e: Event) => {
          const isMobileNow = getMobileState();
          if (isMobileNow) return;
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

        renderedResizer.addEventListener(
          "touchstart",
          (e: Event) => {
            const isMobileNow = getMobileState();
            if (isMobileNow) return;
            isTouchResizing = true;
            const touch = (e as TouchEvent).touches[0];
            startX = touch.clientX;
            const template = grid.layouts[currentLayout]?.template;
            const match = template?.match(/([\d.]+)rem$/);
            if (match) {
              startWidth = parseFloat(match[1]);
            } else {
              startWidth = defaultWidths[currentLayout];
            }
            e.preventDefault();
          },
          { passive: false },
        );
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

    const handleMove = (clientX: number) => {
      if (!isResizing && !isTouchResizing) return;
      const deltaX = clientX - startX;
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
        Tools: {
          template: `"viewer resizer combined" 1fr /1fr 4px ${newWidth}rem`,
        },
      };

      const gridElement = grid;
      if (gridElement) {
        gridElement.style.gridTemplateColumns = `1fr 4px ${newWidth}rem`;
      }
    };

    document.addEventListener("mousemove", (e) => {
      handleMove(e.clientX);
    });

    document.addEventListener(
      "touchmove",
      (e) => {
        if (!isTouchResizing) return;
        const touch = (e as TouchEvent).touches[0];
        handleMove(touch.clientX);
      },
      { passive: false },
    );

    const handleEnd = () => {
      isResizing = false;
      isTouchResizing = false;
    };

    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchend", handleEnd);
  };

  const handleResize = () => {
    // This triggers the layout update and switches to appropriate layout
    // updateMobilePanel now handles all the logic including switching layouts
    updateMobilePanel();

    // Force sidebar to re-render its buttons
    const grid = document.getElementById(state.id);
    if (grid) {
      grid.dispatchEvent(new CustomEvent("layoutchange"));
    }
  };

  window.addEventListener("resize", handleResize);

  return BUI.html`
    <bim-grid id=${state.id} style="padding: ${CONTENT_GRID_GAP}; gap: ${CONTENT_GRID_GAP}; position: relative; width: 100%; height: 100%;" ${BUI.ref(onCreated)}>
      <button 
        id="mobile-panel-toggle"
        onclick="toggleMobilePanel()"
        style="
          display: none;
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          padding: 14px 20px;
          background: var(--bim-ui_accent-base, #6528d7);
          border: none;
          border-radius: 28px;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(101, 40, 215, 0.4);
          font-size: 14px;
          font-weight: 600;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          font-family: inherit;
        "
        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 24px rgba(101, 40, 215, 0.5)';"
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 20px rgba(101, 40, 215, 0.4)';"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
        Tools
      </button>
    </bim-grid>
  `;
};

export const getContentGrid = () => {
  const contentGrid = document.getElementById(CONTENT_GRID_ID) as BUI.Grid<
    ContentGridLayouts,
    ContentGridElements
  > | null;

  return contentGrid;
};
