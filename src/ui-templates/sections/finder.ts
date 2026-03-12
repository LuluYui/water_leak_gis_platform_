import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { appIcons } from "../../globals";

export interface FinderPanelState {
  components: OBC.Components;
}

export interface FloatingPanelConfig {
  icon: string;
  label: string;
}

export const createFloatingPanelTemplate = <T extends FinderPanelState>(
  config: FloatingPanelConfig,
  contentTemplate: (state: T) => BUI.TemplateResult,
): ((state: T) => BUI.TemplateResult) => {
  return (state: T) => {
    return BUI.html`
      <bim-panel-section fixed icon=${config.icon} label=${config.label}>
        ${contentTemplate(state)}
      </bim-panel-section>
    `;
  };
};

export const finderPanelTemplate: BUI.StatefullComponent<FinderPanelState> = (
  state,
) => {
  const { components } = state;

  const finder = components.get(OBC.ItemsFinder);
  const hider = components.get(OBC.Hider);

  const getFinderResult = async (queryName: string) => {
    const finderQuery = finder.list.get(queryName);
    if (!finderQuery) return {};
    const result = await finderQuery.test();
    return result;
  };

  const onIsolateFinder = async (
    { target }: { target: BUI.Button },
    queryName: string,
  ) => {
    target.loading = true;
    const modelIdMap = await getFinderResult(queryName);
    await hider.isolate(modelIdMap);
    target.loading = false;
  };

  const onResetVisibility = async ({ target }: { target: BUI.Button }) => {
    target.loading = true;
    await hider.set(true);
    target.loading = false;
  };

  const finderQueries = Array.from(finder.list.keys());

  return BUI.html`
        <bim-panel-section fixed icon=${appIcons.SEARCH} label="Filter" style="margin: 1rem; align-self: start;">
            <bim-button style="width: 100%;" label="Reset Visibility" @click=${onResetVisibility}></bim-button>
            <bim-panel-section style="gap: 0.25rem; max-height: 400px; overflow-y: auto; overflow-x: hidden;">
                ${
                  finderQueries.length > 0
                    ? finderQueries.map(
                        (queryName) => BUI.html`
                                <bim-button label="${queryName}" @click=${(
                                  e: Event,
                                ) => {
                                  const target = e.target as BUI.Button;
                                  onIsolateFinder({ target }, queryName);
                                }}></bim-button>
                            `,
                      )
                    : BUI.html`<bim-panel-section style="padding: 0.5rem;">No categories found. Load a model first.</bim-panel-section>`
                }
            </bmi-panel-section>
        </bim-panel-section>
`;
};
