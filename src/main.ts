import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "./ui-templates";
import { updateToolbarVertical } from "./ui-templates/toolbars/viewer-toolbar";
import { appIcons, CONTENT_GRID_ID } from "./globals";
import { viewportSettingsTemplate } from "./ui-templates/buttons/viewport-settings";
import { iotDashboardTemplate } from "./ui-templates/sections/iot-dashboard";
import { getFlowMetersCoordinates } from "./utils/getFlowMeters";
import { liveIoTManager } from "./utils/LiveIoTManager";
import { setupFinderQueries } from "./utils/setupFinder";
import {
  detectDeviceCapabilities,
  getRecommendedSettings,
} from "./utils/DeviceDetector";

const deviceCapabilities = detectDeviceCapabilities();
const recommendedSettings = getRecommendedSettings(deviceCapabilities);

BUI.Manager.init();

interface HK80Offset {
  easting: number;
  northing: number;
  elevation: number;
}

let hk80Offset: HK80Offset | null = {
  easting: 827961.539,
  northing: 824013.889,
  elevation: 0,
};

function toHK80(
  x: number,
  y: number,
  z: number,
): { easting: number; northing: number; elevation: number } | null {
  if (!hk80Offset) return null;
  return {
    easting: x + hk80Offset.easting,
    northing: z + hk80Offset.northing,
    elevation: y + hk80Offset.elevation,
  };
}

function formatHK80Coord(hk80: {
  easting: number;
  northing: number;
  elevation: number;
}): string {
  return `E: ${hk80.easting.toFixed(3)}  N: ${hk80.northing.toFixed(3)}  El: ${hk80.elevation.toFixed(3)} m`;
}

// Components Setup

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();
world.name = "Main";
world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = new THREE.Color(0x1a1d23);

const viewport = BUI.Component.create<BUI.Viewport>(() => {
  return BUI.html`<bim-viewport></bim-viewport>`;
});

world.renderer = new OBF.PostproductionRenderer(components, viewport);
world.camera = new OBC.OrthoPerspectiveCamera(components);
world.camera.threePersp.near = 0.01;
world.camera.threePersp.updateProjectionMatrix();
world.camera.controls.restThreshold = 0.05;

const worldGrid = components.get(OBC.Grids).create(world);
worldGrid.material.uniforms.uColor.value = new THREE.Color(0x494b50);
worldGrid.material.uniforms.uSize1.value = 2;
worldGrid.material.uniforms.uSize2.value = 8;

const resizeWorld = () => {
  world.renderer?.resize();
  world.camera.updateAspect();
};
viewport.addEventListener("resize", resizeWorld);
world.dynamicAnchor = false;
components.init();

const highlighter = components.get(OBF.Highlighter);
highlighter.setup({ world });
highlighter.enabled = true;

const lengthMeasurer = components.get(OBF.LengthMeasurement);
lengthMeasurer.world = world;

const areaMeasurer = components.get(OBF.AreaMeasurement);
areaMeasurer.world = world;

const clipper = components.get(OBC.Clipper);

viewport.addEventListener("dblclick", () => {
  if (lengthMeasurer.enabled) {
    lengthMeasurer.create();
  }
  if (areaMeasurer.enabled) {
    areaMeasurer.create();
  }
  if (clipper.enabled) {
    clipper.create(world);
  }
});

// Enable picking for digital twin functionality
const raycaster = components.get(OBC.Raycasters).get(world);
raycaster.enabled = true;
const fragments = components.get(OBC.FragmentsManager);
fragments.init("/worker.mjs");

const ifcLoader = components.get(OBC.IfcLoader);
await ifcLoader.setup({
  autoSetWasm: false,
  wasm: { absolute: true, path: "https://unpkg.com/web-ifc@0.0.74/" },
});

setupFinderQueries(components);

// Coordinate Display Setup
const coordDisplay = document.createElement("div");
coordDisplay.id = "coord-display";
coordDisplay.style.cssText = `
  position: fixed;
  bottom: 30px;
  left: 100px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
  z-index: 1000;
  pointer-events: none;
`;
coordDisplay.textContent = "E: ---  N: ---  El: --- m";
document.body.appendChild(coordDisplay);

viewport.addEventListener("mousemove", async (_event) => {
  try {
    const intersection = await raycaster.castRay();
    if (intersection) {
      const point = (intersection as any).point;
      if (point) {
        if (hk80Offset) {
          const hk80 = toHK80(point.x, point.y, point.z);
          if (hk80) coordDisplay.textContent = formatHK80Coord(hk80);
        } else {
          coordDisplay.textContent = `X: ${point.x.toFixed(3)}  Y: ${point.y.toFixed(3)}  Z: ${point.z.toFixed(3)}`;
        }
      }
    }
  } catch {}
});

viewport.addEventListener("mouseleave", () => {
  coordDisplay.textContent = "E: ---  N: ---  El: --- m";
});

fragments.list.onItemSet.add(async ({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  await fragments.core.update(true);

  const ifcFlowMeters = await getFlowMetersCoordinates(components);
  liveIoTManager.initialize(components, world);

  if (ifcFlowMeters.length > 0) {
    liveIoTManager.initializeFromIFCMeters(
      ifcFlowMeters.map((fm) => ({
        localId: fm.localId,
        modelId: fm.modelId,
        position: fm.position,
        name: fm.name || `FM-${fm.localId}`,
      })),
    );
    liveIoTManager.createMarkers();
  }

  const controls = world.camera.controls;
  const hider = components.get(OBC.Hider);

  controls.setLookAt(-50, 70, 70, -116, 0, 30, true);

  setTimeout(async () => {
    if (hider) {
      await hider.set(true);
    }
    world.camera.three.updateProjectionMatrix();
    await fragments.core.update(true);
  }, 700);
});

// Layout / UI Integration

const [viewportSettings] = BUI.Component.create(viewportSettingsTemplate, {
  components,
  world,
});
viewport.append(viewportSettings);

const [iotPanel] = BUI.Component.create(iotDashboardTemplate, {
  iotManager: liveIoTManager,
});
viewport.append(iotPanel);

const [viewportGrid] = BUI.Component.create(TEMPLATES.viewportGridTemplate, {
  components,
  world,
});
viewport.append(viewportGrid);

const viewportCardTemplate = () =>
  BUI.html`<div class="dashboard-card" style="padding: 0px;">${viewport}</div>`;

const [contentGrid] = BUI.Component.create<
  BUI.Grid<TEMPLATES.ContentGridLayouts, TEMPLATES.ContentGridElements>,
  TEMPLATES.ContentGridState
>(TEMPLATES.contentGridTemplate, {
  components,
  world,
  id: CONTENT_GRID_ID,
  viewportTemplate: viewportCardTemplate,
});

const setInitialLayout = () => {
  const layouts = contentGrid.layouts;
  if (!layouts || Object.keys(layouts).length === 0) {
    setTimeout(setInitialLayout, 100);
    return;
  }
  if (window.location.hash) {
    const hash = window.location.hash.slice(
      1,
    ) as TEMPLATES.ContentGridLayouts[number];
    contentGrid.layout = Object.keys(layouts).includes(hash) ? hash : "Viewer";
  } else {
    window.location.hash = "Viewer";
    contentGrid.layout = "Viewer";
  }
};

setInitialLayout();
contentGrid.addEventListener("layoutchange", () => {
  window.location.hash = contentGrid.layout as string;
});

type AppLayouts = ["App"];
type Sidebar = {
  name: "sidebar";
  state: TEMPLATES.GridSidebarState;
};
type ContentGrid = { name: "contentGrid"; state: TEMPLATES.ContentGridState };
type AppGridElements = [Sidebar, ContentGrid];

const app = document.getElementById("app") as BUI.Grid<
  AppLayouts,
  AppGridElements
>;

app.elements = {
  sidebar: {
    template: TEMPLATES.gridSidebarTemplate,
    initialState: {
      grid: contentGrid,
      compact: true,
      layoutIcons: {
        Viewer: appIcons.MODEL,
        "DMA/PMA Dashboard": appIcons.CHART,
        BimAnalytics: appIcons.TASK,
        Tools: appIcons.LAYOUT,
        Viewer_m: appIcons.MODEL,
        "DMA/PMA Dashboard_m": appIcons.CHART,
        BimAnalytics_m: appIcons.TASK,
        Tools_m: appIcons.LAYOUT,
      },
    },
  },
  contentGrid,
};

app.layouts = { App: { template: `"sidebar contentGrid" 1fr /auto 1fr` } };
app.layout = "App";

const updateLayoutsForViewport = () => {
  updateToolbarVertical();
};

window.addEventListener("resize", updateLayoutsForViewport);
updateLayoutsForViewport();

(window as any).components = components;
(window as any).world = world;
(window as any).fragments = fragments;
(window as any).THREE = THREE;
(window as any).liveIoTManager = liveIoTManager;

if (!recommendedSettings.enablePostProcessing && world.renderer) {
  const renderer = world.renderer as OBF.PostproductionRenderer;
  if (renderer.postproduction) {
    renderer.postproduction.enabled = false;
  }
}

const loadInitialFragment = async () => {
  console.log("[App] Loading water_mains.frag...");
  try {
    const file = await fetch("/water_mains.frag");
    if (!file.ok) {
      console.error(`[App] Failed to fetch: ${file.status}`);
      return;
    }
    const data = await file.arrayBuffer();
    await fragments.core.load(new Uint8Array(data), {
      modelId: "water_mains",
    });
    console.log("[App] Loaded water_mains.frag successfully");
  } catch (error) {
    console.error("[App] Failed to load water_mains.frag:", error);
  }
};

setTimeout(() => {
  loadInitialFragment();
}, 500);
