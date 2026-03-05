import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { ViewerToolbarState, viewerToolbarTemplate } from "..";
import { viewportButtonsTemplate } from "../buttons/viewport-buttons";

export interface FloatingPanelItemConfig {
  icon: string;
  label: string;
  contentTemplate: (components: OBC.Components) => BUI.TemplateResult;
}

export interface FloatingViewportState {
  components: OBC.Components;
  world: OBC.World;
  panels?: FloatingPanelItemConfig[];
}

export const createFloatingPanelContent = (config: FloatingPanelItemConfig) => {
  return (components: OBC.Components) => {
    return BUI.html`
      <bim-panel-section fixed icon=${config.icon} label=${config.label}>
        ${config.contentTemplate(components)}
      </bim-panel-section>
    `;
  };
};

type BottomToolbar = { name: "bottomToolbar"; state: ViewerToolbarState };
type LeftToolbar = {
  name: "leftToolbar";
  state: {
    components: OBC.Components;
  };
};
type CustomPanel = {
  name: "customPanel";
  state: { components: OBC.Components };
};

type FloatingViewportElements = [BottomToolbar, LeftToolbar, ...CustomPanel[]];

type FloatingViewportLayouts = ["main"];

export const floatingViewportPanelTemplate: BUI.StatefullComponent<
  FloatingViewportState
> = (state) => {
  const { components, world, panels = [] } = state;

  const elements: BUI.GridComponents<FloatingViewportElements> = {
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
  };

  panels.forEach((panel, index) => {
    const panelName = `customPanel${index}`;
    (elements as any)[panelName] = {
      template: createFloatingPanelContent(panel),
      initialState: { components },
    };
  });

  const panelNames = [
    "leftToolbar",
    "bottomToolbar",
    ...panels.map((_, i) => `customPanel${i}`),
  ];

  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<
      FloatingViewportLayouts,
      FloatingViewportElements
    >;
    grid.elements = elements;

    const templateParts = panelNames.join(" ");
    const templateSizes = panelNames.map(() => "auto").join(" ");

    grid.layouts = {
      main: {
        template: `
          "${templateParts}" 1fr
          "bottomToolbar bottomToolbar bottomToolbar" auto
          /${templateSizes}
        `,
      },
    };
  };

  return BUI.html`<bim-grid ${BUI.ref(onCreated)} layout="main" floating></bim-grid>`;
};
