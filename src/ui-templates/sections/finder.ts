import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import interact from "interactjs";
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

  const initDraggable = (el: Element | undefined) => {
    if (!el) return;
    const panel = el as HTMLElement;
    panel.style.position = "absolute";
    panel.style.zIndex = "100";
    panel.style.top = "1rem";
    panel.style.right = "1rem";
    panel.style.touchAction = "none";
    panel.style.width = "20rem";

    interact(panel).draggable({
      listeners: {
        move(event) {
          const { target } = event;
          const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
          const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

          target.style.transform = `translate(${x}px, ${y}px)`;

          target.setAttribute("data-x", x);
          target.setAttribute("data-y", y);
        },
      },
    });
  };

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
        <bim-panel-section fixed icon=${appIcons.SEARCH} label="Filter" style="margin: 1rem; align-self: start;" ${BUI.ref(initDraggable)}>
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
