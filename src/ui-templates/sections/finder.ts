import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { appIcons } from "../../globals";

export interface FinderPanelState {
  components: OBC.Components;
}

export const finderPanelTemplate: BUI.StatefullComponent<FinderPanelState> = (
  state,
) => {
  const { components } = state;

  const finder = components.get(OBC.ItemsFinder);
  const hider = components.get(OBC.Hider);

  const createFinderQueries = () => {
    finder.create("FlowMeters", [
      {
        categories: [/IFCFLOWCONTROLLER/],
        attributes: { queries: [{ name: /Name/, value: /Flowmeter/ }] },
      },
    ]);
    finder.create("Flow Segment", [{ categories: [/IFCFLOWSEGMENT/] }]);
    finder.create("Leak Point Pit", [
      {
        categories: [/IFCBUILDINGELEMENTPROXY/],
        attributes: { queries: [{ name: /Name/, value: /Leak/ }] },
      },
    ]);
    finder.create("Chamber", [
      {
        categories: [/IFCBUILDINGELEMENTPROXY/],
        attributes: { queries: [{ name: /Name/, value: /Chamber/ }] },
      },
    ]);
    finder.create("Manhole", [
      {
        categories: [/IFCFLOWTERMINAL/],
        attributes: { queries: [{ name: /Name/, value: /Manhole/ }] },
      },
    ]);
    finder.create("Microphone Pit", [
      {
        categories: [/IFCBUILDINGELEMENTPROXY/],
        attributes: { queries: [{ name: /Name/, value: /Microphone/ }] },
      },
    ]);
    finder.create("Fire Hydrant", [
      {
        categories: [/IFCBUILDINGELEMENTPROXY/],
        attributes: { queries: [{ name: /Name/, value: /M_Fire/ }] },
      },
    ]);
  };

  createFinderQueries();

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
        <bim-panel-section fixed icon=${appIcons.SEARCH} label="Filter">
            <bim-button style="width: 100%;" label="Reset Visibility" @click=${onResetVisibility}></bim-button>
            <bim-panel-section style="gap: 0.25rem; max-height: 300px; overflow-y: hidden; overflow-x: hidden;">
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
                    : BUI.html`<bmi-panel-section style="padding: 0.5rem;">No categories found. Load a model first.</bmi-panel-section>`
                }
            </bmi-panel-section>
        </bim-panel-section>
`;
};
