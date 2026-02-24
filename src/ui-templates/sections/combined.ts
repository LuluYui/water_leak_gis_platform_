import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { appIcons } from "../../globals";

export interface CombinedPanelState {
  components: OBC.Components;
  world?: OBC.World;
}

export const combinedPanelTemplate: BUI.StatefullComponent<
  CombinedPanelState
> = (state) => {
  const { components, world } = state;

  const ifcLoader = components.get(OBC.IfcLoader);
  const fragments = components.get(OBC.FragmentsManager);
  const highlighter = components.get(OBF.Highlighter);
  const viewpointsManager = components.get(OBC.Viewpoints);

  // Load preset fragments
  const loadPresetFragments = async () => {
    const fragPaths = ["/water_mains.frag"];
    try {
      await Promise.all(
        fragPaths.map(async (path) => {
          const modelId = path.split("/").pop()?.split(".").shift();
          if (!modelId) return null;
          const file = await fetch(path);
          const buffer = await file.arrayBuffer();
          return fragments.core.load(buffer, { modelId });
        }),
      );
    } catch (err) {
      console.warn("Failed to load preset fragments:", err);
    }
  };
  loadPresetFragments();

  const [modelsList] = CUI.tables.modelsList({
    components,
    actions: { download: false },
  });

  const [propsTable, updatePropsTable] = CUI.tables.itemsData({
    components,
    modelIdMap: {},
  });

  const [viewpoints] = CUI.tables.viewpointsList({ components });

  propsTable.preserveStructureOnFilter = true;

  highlighter.events.select.onHighlight.add((modelIdMap) => {
    updatePropsTable({ modelIdMap });
  });

  highlighter.events.select.onClear.add(() => {
    updatePropsTable({ modelIdMap: {} });
  });

  const onAddIfcModel = async ({ target }: { target: BUI.Button }) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = ".ifc";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      target.loading = true;
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await ifcLoader.load(bytes, true, file.name.replace(".ifc", ""));
      target.loading = false;
      BUI.ContextMenu.removeMenus();
    });

    input.addEventListener("cancel", () => (target.loading = false));

    input.click();
  };

  const onAddFragmentsModel = async ({ target }: { target: BUI.Button }) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = ".frag";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      target.loading = true;
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await fragments.core.load(bytes, {
        modelId: file.name.replace(".frag", ""),
      });
      target.loading = false;
      BUI.ContextMenu.removeMenus();
    });

    input.addEventListener("cancel", () => (target.loading = false));

    input.click();
  };

  const onExportFragmentsModel = async ({ target }: { target: BUI.Button }) => {
    target.loading = true;
    try {
      for (const [, model] of fragments.list) {
        const buffer = await model.getBuffer(false);
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${model.modelId}.frag`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn("Failed to export model:", e);
    }
    target.loading = false;
    BUI.ContextMenu.removeMenus();
  };

  const onSearchModels = (e: Event) => {
    const input = e.target as BUI.TextInput;
    modelsList.queryString = input.value;
  };

  const onSearchElements = (e: Event) => {
    const input = e.target as BUI.TextInput;
    propsTable.queryString = input.value;
  };

  const toggleExpanded = () => {
    propsTable.expanded = !propsTable.expanded;
  };

  const sectionId = BUI.Manager.newRandomId();

  const onCreateViewpoint = async ({ target }: { target: BUI.Button }) => {
    target.loading = true;
    const viewpoint = viewpointsManager.create();
    viewpoint.world = world ?? null;
    await viewpoint.updateCamera();

    const selection = highlighter.selection.select;
    if (!OBC.ModelIdMapUtils.isEmpty(selection)) {
      const guids = await fragments.modelIdMapToGuids(selection);
      viewpoint.selectionComponents.add(...guids);
    }

    for (const [style, definition] of highlighter.styles) {
      if (!definition) continue;
      const map = highlighter.selection[style];
      if (OBC.ModelIdMapUtils.isEmpty(map)) continue;
      const guids = await fragments.modelIdMapToGuids(map);
      viewpoint.componentColors.set(definition.color.getHexString(), guids);
    }

    target.loading = false;
  };

  // Create finder queries UI

  return BUI.html`
        <bim-panel-section icon=${appIcons.LAYOUT} label="All Panels">
        <div style="display: flex; flex-direction: column; gap: 0rem; overflow:hidden">
                <bim-panel-section id=${sectionId} icon=${appIcons.MODEL} label="Models">
                    <div style="display: flex; gap: 0.5rem;">
                        <bim-text-input @input=${onSearchModels} vertical placeholder="Search..." debounce="200"></bim-text-input>
                        <bim-button style="flex: 0;" icon=${appIcons.ADD}>
                        <bim-context-menu style="gap: 0.25rem; ">
                                <bim-button label="IFC" @click=${onAddIfcModel}></bim-button>
                                <bim-button label="Fragments" @click=${onAddFragmentsModel}></bim-button>
                            </bim-context-menu>
                        </bim-button>
                        <bim-button style="flex: 0;" icon=${appIcons.EXPORT} tooltip-title="Export to Fragments" @click=${onExportFragmentsModel}></bim-button>
                    </div>
                    ${modelsList}
                </bim-panel-section>

                <bim-panel-section icon=${appIcons.TASK} label="Selection Data">
                    <div style="display: flex; gap: 0.375rem; align-items: center;">
                        <bim-text-input @input=${onSearchElements} vertical placeholder="Search..." debounce="200"></bim-text-input>
                        <bim-button style="flex: 0;" @click=${toggleExpanded} icon=${appIcons.EXPAND} tooltip-title="Expand Rows"></bim-button>
                        <bim-button style="flex: 0;" @click=${() => propsTable.downloadData("ElementData", "tsv")} icon=${appIcons.EXPORT} tooltip-title="Export Data" tooltip-text="Export the shown properties to TSV."></bim-button>
                    </div>
                    ${propsTable}
                </bim-panel-section>

                <bim-panel-section icon=${appIcons.CAMERA} label="Viewpoints">
                    <bim-button style="flex: 0;" label="Add" icon=${appIcons.ADD} @click=${onCreateViewpoint}></bim-button>
                    ${viewpoints}
                </bim-panel-section>

            </div>
        </bim-panel-section>
    `;
};
