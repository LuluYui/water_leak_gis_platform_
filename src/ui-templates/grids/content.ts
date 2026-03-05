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

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ContentGridLayouts, ContentGridElements>;

    (grid as any).resizeableAreas = true;

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
        template: `
                    "viewer combined" 1fr
                    /1fr 25rem
                `,
      },
      Analytics: {
        template: `
                    "viewer analytics" 1fr
                    /1fr 60rem
                `,
      },
      BimAnalytics: {
        template: `
                    "viewer bimAnalytics" 1fr
                    /1fr 60rem
                `,
      },
    };
  };

  return BUI.html`
        <bim-grid id=${state.id} resizeable-areas style="padding: ${CONTENT_GRID_GAP}; gap: ${CONTENT_GRID_GAP}" ${BUI.ref(onCreated)}></bim-grid>
    `;
};
export const getContentGrid = () => {
  const contentGrid = document.getElementById(CONTENT_GRID_ID) as BUI.Grid<
    ContentGridLayouts,
    ContentGridElements
  > | null;

  return contentGrid;
};
