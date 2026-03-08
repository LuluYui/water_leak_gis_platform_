import * as BUI from "@thatopen/ui";
import { appIcons } from "../../globals";

export interface GridSidebarState {
  grid: BUI.Grid<any, any>;
  compact: boolean;
  layoutIcons: Record<string, string>;
}

export const gridSidebarTemplate: BUI.StatefullComponent<GridSidebarState> = (
  state,
  update,
) => {
  const { grid, compact, layoutIcons } = state;

  if (!(grid as any)._sidebarListenerAdded) {
    grid.addEventListener("layoutchange", () => update());
    (grid as any)._sidebarListenerAdded = true;
  }

  const onToggleCompact = () => {
    update({ compact: !state.compact });
  };

  const layouts = grid.layouts || {};
  const layoutKeys = Object.keys(layouts);

  return BUI.html`
  <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; border-right: 1px solid var(--bim-ui_bg-contrast-40); padding: 0.5rem;">
    <div class="sidebar">
      ${layoutKeys.map((layout) => {
        const layoutIcon = layoutIcons[layout];
        const icon = !layoutIcon ? appIcons.LAYOUT : layoutIcon;
        return BUI.html`
          <bim-button ?active=${grid.layout === layout} @click=${() => (grid.layout = layout)} ?label-hidden=${compact} icon=${icon} label=${layout}></bim-button> 
        `;
      })}
    </div>
    <bim-button ?label-hidden=${compact} label="Collapse" style="width: fit-content; flex: 0; background-color: transparent; border-radius: ${compact ? "100%" : "0"}" icon=${compact ? appIcons.RIGHT : appIcons.LEFT} @click=${onToggleCompact}></bim-button>
  </div>
`;
};
