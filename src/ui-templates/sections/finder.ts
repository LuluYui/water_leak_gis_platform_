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
    finder.create("Walls", [{ categories: [/WALL/] }]);
    finder.create("Floors", [{ categories: [/SLAB/, /FLOOR/] }]);
    finder.create("Doors", [{ categories: [/DOOR/] }]);
    finder.create("Windows", [{ categories: [/WINDOW/] }]);
    finder.create("Columns", [{ categories: [/COLUMN/] }]);
    finder.create("Beams", [{ categories: [/BEAM/] }]);
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

  const onDragStart = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const panel = target.closest(".finder-panel") as HTMLElement;
    if (!panel) return;

    panel.dataset.dragging = "true";
    panel.dataset.startX = e.clientX.toString();
    panel.dataset.startY = e.clientY.toString();

    const panelRect = panel.getBoundingClientRect();
    panel.dataset.offsetX = (e.clientX - panelRect.left).toString();
    panel.dataset.offsetY = (e.clientY - panelRect.top).toString();

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (panel.dataset.dragging !== "true") return;

      const startX = parseInt(panel.dataset.startX || "0");
      const startY = parseInt(panel.dataset.startY || "0");

      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const newLeft = parseInt(panel.dataset.startLeft || "0") + dx;
      const newTop = parseInt(panel.dataset.startTop || "0") + dy;

      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
      panel.dataset.dragging = "false";
      const rect = panel.getBoundingClientRect();
      panel.dataset.startLeft = rect.left.toString();
      panel.dataset.startTop = rect.top.toString();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    panel.dataset.startLeft = panelRect.left.toString();
    panel.dataset.startTop = panelRect.top.toString();

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return BUI.html`
    <div 
        class="finder-panel" 
        style="position: absolute; top: 10px; left: 10px; z-index: 1000; cursor: move; user-select: none; overflow-x: hidden;"
        @mousedown=${onDragStart}
    >
        <bim-panel-section icon=${appIcons.SEARCH} label="Filter">
            <bim-button style="width: 100%; margin-bottom: 0.5rem;" label="Reset Visibility" @click=${onResetVisibility}></bim-button>
            <div style="display: flex; flex-direction: column; gap: 0.25rem; max-height: 300px; overflow-y: auto; overflow-x: hidden;">
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
                    : BUI.html`<div style="padding: 0.5rem;">No categories found. Load a model first.</div>`
                }
            </div>
        </bim-panel-section>
    </div>
`;
};
