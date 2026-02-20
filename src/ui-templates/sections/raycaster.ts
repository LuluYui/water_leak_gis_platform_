import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as THREE from "three";

export interface RaycasterPanelState {
  components: OBC.Components;
}

export const raycasterPanelTemplate: BUI.StatefullComponent<
  RaycasterPanelState
> = (state) => {
  const { components } = state;

  const fragments = components.get(OBC.FragmentsManager);
  const color = new THREE.Color("purple");

  const onColorChange = ({ target }: { target: BUI.ColorInput }) => {
    color.set(target.color);
  };

  const onClearColors = async ({ target }: { target: BUI.Button }) => {
    target.loading = true;
    await fragments.resetHighlight();
    await fragments.core.update(true);
    target.loading = false;
  };

  return BUI.html`
    <bim-panel-section fixed label="Raycaster">
      <bim-panel-section label="Controls">
        <bim-label>Double Click: Colorize element</bim-label>
        <bim-color-input @input=${onColorChange} color=#${color.getHexString()}></bim-color-input>
        <bim-button label="Clear Colors" @click=${onClearColors}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Item Data">
        <bim-label>Hover over element to see data</bim-label>
      </bim-panel-section>
    </bim-panel-section>
  `;
};
