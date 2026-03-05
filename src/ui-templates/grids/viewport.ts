import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { ViewerToolbarState, viewerToolbarTemplate } from "..";
import { finderPanelTemplate } from "../sections/finder";
import { viewportButtonsTemplate } from "../buttons/viewport-buttons";

type BottomToolbar = { name: "bottomToolbar"; state: ViewerToolbarState };
type LeftToolbar = {
  name: "leftToolbar";
  state: {
    components: OBC.Components;
  };
};
type FinderPanel = {
  name: "finderPanel";
  state: { components: OBC.Components };
};

type ViewportGridElements = [BottomToolbar, LeftToolbar, FinderPanel];

type ViewportGridLayouts = ["main", "finder"];

interface ViewportGridState {
  components: OBC.Components;
  world: OBC.World;
}

export const viewportGridTemplate: BUI.StatefullComponent<ViewportGridState> = (
  state,
) => {
  const { components, world } = state;

  const elements: BUI.GridComponents<ViewportGridElements> = {
    leftToolbar: {
      template: viewportButtonsTemplate,
      initialState: {
        components,
      },
    },
    bottomToolbar: {
      template: viewerToolbarTemplate,
      initialState: { components, world },
    },
    finderPanel: {
      template: finderPanelTemplate,
      initialState: { components },
    },
  };

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ViewportGridLayouts, ViewportGridElements>;
    grid.elements = elements;

    grid.layouts = {
      main: {
        template: `
          "leftToolbar . finderPanel" 1fr
          "bottomToolbar bottomToolbar bottomToolbar" auto
          /auto 1fr auto
        `,
      },
      finder: {
        template: `
          "finderPanel" 1fr
          /20rem
        `,
      },
    };
  };

  return BUI.html`<bim-grid ${BUI.ref(onCreated)} layout="main" floating></bim-grid>`;
};
