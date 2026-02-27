import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "./ui-templates";
import { appIcons, CONTENT_GRID_ID } from "./globals";
import { viewportSettingsTemplate } from "./ui-templates/buttons/viewport-settings";
import {
  getFlowMetersCoordinates,
  createFlowMeterMarkers,
} from "./utils/getFlowMeters";

BUI.Manager.init();

interface HK80Offset {
  easting: number;
  northing: number;
  elevation: number;
}

let hk80Offset: HK80Offset | null = null;

function parseHK80OffsetFromIFC(ifcContent: string): HK80Offset | null {
  const matches = ifcContent.matchAll(
    /IFCCARTESIANPOINT\(\((\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)\)\)/g,
  );

  for (const match of matches) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const z = parseFloat(match[3]);

    if (x > 100000 && y > 100000) {
      console.log("Parsed HK80 offset from IFC:", {
        easting: x,
        northing: y,
        elevation: z,
      });
      return {
        easting: x,
        northing: y,
        elevation: z,
      };
    }
  }
  return null;
}

function toHK80(
  x: number,
  y: number,
  z: number,
): { easting: number; northing: number; elevation: number } | null {
  if (!hk80Offset) return null;
  return {
    easting: x + hk80Offset.easting / 1000,
    northing: y + hk80Offset.northing / 1000,
    elevation: z,
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

// world.camera.controls.addEventListener("control", () => {
//   const controls = world.camera.controls as any;
//   console.log(world.camera.three);

//   console.log("Camera position:", {
//     position: world.camera.three.position.toArray(),
//     zoom: world.camera.three.zoom,
//   });
// });

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

components.get(OBC.Raycasters).get(world);

const fragments = components.get(OBC.FragmentsManager);
fragments.init("/node_modules/@thatopen/fragments/dist/Worker/worker.mjs");

fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
  const isLod = "isLodMaterial" in material && material.isLodMaterial;
  if (isLod) {
    const renderer = world.renderer;
    if (renderer && (renderer as any).postproduction?.enabled) {
      (renderer as any).postproduction.basePass.isolatedMaterials.push(
        material,
      );
    }
  }
});

world.camera.projection.onChanged.add(() => {
  for (const [_, model] of fragments.list) {
    model.useCamera(world.camera.three);
  }
});

world.camera.controls.addEventListener("rest", () => {
  fragments.core.update(true);
});

const ifcLoader = components.get(OBC.IfcLoader);
await ifcLoader.setup({
  autoSetWasm: false,
  wasm: { absolute: true, path: "https://unpkg.com/web-ifc@0.0.74/" },
});

const highlighter = components.get(OBF.Highlighter);
highlighter.setup({
  world,
  selectMaterialDefinition: {
    color: new THREE.Color("#124bcf"),
    renderedFaces: 1,
    opacity: 1,
    transparent: false,
  },
});

// Coordinate Display Setup
const coordDisplay = document.createElement("div");
coordDisplay.id = "coord-display";
coordDisplay.style.cssText = `
  position: fixed;
  bottom: 20px;
  left: 20px;
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

// Hover Tooltip Setup
const tooltip = document.createElement("div");
tooltip.id = "hover-tooltip";
tooltip.style.cssText = `
  position: fixed;
  display: none;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-family: sans-serif;
  pointer-events: none;
  z-index: 1000;
  max-width: 300px;
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
document.body.appendChild(tooltip);

// Use raycaster to get element properties
const raycaster = components.get(OBC.Raycasters).get(world);

const updateHoverTooltip = async (event: MouseEvent) => {
  try {
    const intersection = await raycaster.castRay();
    if (!intersection) {
      tooltip.style.display = "none";
      return;
    }

    const intersectionAny = intersection as any;
    const modelId = intersectionAny.fragments?.modelId;
    const localId = intersectionAny.localId;
    const point = intersectionAny.point;

    let tooltipContent = "";

    if (point) {
      if (hk80Offset) {
        const hk80 = toHK80(point.x, point.y, point.z);
        if (hk80) {
          tooltipContent += formatHK80Coord(hk80);
        }
      } else {
        tooltipContent += `X: ${point.x.toFixed(3)}  Y: ${point.y.toFixed(3)}  Z: ${point.z.toFixed(3)}`;
      }
    }

    if (!modelId || localId === undefined) {
      tooltip.style.display = "block";
      tooltip.textContent = point
        ? hk80Offset
          ? formatHK80Coord(toHK80(point.x, point.y, point.z)!) + "\n"
          : `X: ${point.x.toFixed(3)}  Y: ${point.y.toFixed(3)}  Z: ${point.z.toFixed(3)}\n`
        : "No data";
      tooltip.style.left = `${event.clientX + 15}px`;
      tooltip.style.top = `${event.clientY + 15}px`;
      return;
    }

    const modelIdMap = {
      [modelId]: new Set([localId]),
    };

    const modelIdKey = Object.keys(modelIdMap)[0];
    const modelIdMapAny = modelIdMap as any;
    const idSet = modelIdMapAny[modelIdKey];
    if (modelIdKey && idSet && fragments.list.get(modelIdKey)) {
      const model = fragments.list.get(modelIdKey)!;
      const [data] = await model.getItemsData([...idSet]);
      const dataAny = data as any;

      let nameInfo = "";
      if (dataAny && dataAny.Name && dataAny.Name.value) {
        nameInfo = dataAny.Name.value;
      } else {
        nameInfo = `LocalID: ${localId}`;
      }

      let coordInfo = "";
      if (point) {
        if (hk80Offset) {
          const hk80 = toHK80(point.x, point.y, point.z);
          if (hk80) {
            coordInfo = formatHK80Coord(hk80) + "\n";
          }
        } else {
          coordInfo = `X: ${point.x.toFixed(3)}  Y: ${point.y.toFixed(3)}  Z: ${point.z.toFixed(3)}\n`;
        }
      }

      tooltip.textContent = coordInfo ? `${coordInfo}${nameInfo}` : nameInfo;
      tooltip.style.display = "block";
      tooltip.style.left = `${event.clientX + 15}px`;
      tooltip.style.top = `${event.clientY + 15}px`;
    }
  } catch (e) {
    console.warn("Hover error:", e);
    tooltip.style.display = "none";
  }
};

// Hover tooltip on mousemove with debounce
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

viewport.addEventListener("mousemove", async (event) => {
  // Update coordinate display
  try {
    const intersection = await raycaster.castRay();
    if (intersection) {
      const point = (intersection as any).point;
      if (point) {
        if (hk80Offset) {
          const hk80 = toHK80(point.x, point.y, point.z);
          if (hk80) {
            coordDisplay.textContent = formatHK80Coord(hk80);
          }
        } else {
          coordDisplay.textContent = `X: ${point.x.toFixed(3)}  Y: ${point.y.toFixed(3)}  Z: ${point.z.toFixed(3)}`;
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  if (hoverTimeout) clearTimeout(hoverTimeout);

  hoverTimeout = setTimeout(() => {
    updateHoverTooltip(event);
  }, 150);
});

viewport.addEventListener("mouseleave", () => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
  tooltip.style.display = "none";
  coordDisplay.textContent = "E: ---  N: ---  El: --- m";
});

// clipper Setup

const clipper = components.get(OBC.Clipper);
viewport.ondblclick = () => {
  if (clipper.enabled) clipper.create(world);
};

window.addEventListener("keydown", (event) => {
  if (event.code === "Delete" || event.code === "Backspace") {
    clipper.delete(world);
  }
});

// Length Measurement Setup
const lengthMeasurer = components.get(OBF.LengthMeasurement);
lengthMeasurer.world = world;
lengthMeasurer.color = new THREE.Color("#6528d7");

lengthMeasurer.list.onItemAdded.add((line) => {
  const center = new THREE.Vector3();
  line.getCenter(center);
  const radius = line.distance() / 3;
  const sphere = new THREE.Sphere(center, radius);
  world.camera.controls.fitToSphere(sphere, true);
});
viewport.addEventListener("dblclick", () => lengthMeasurer.create());

window.addEventListener("keydown", (event) => {
  if (event.code === "Delete" || event.code === "Backspace") {
    lengthMeasurer.delete();
  }
});

// Area Measurement Setup
const areaMeasurer = components.get(OBF.AreaMeasurement);
areaMeasurer.world = world;
areaMeasurer.color = new THREE.Color("#6528d7");

areaMeasurer.list.onItemAdded.add((area) => {
  if (!area.boundingBox) return;
  const sphere = new THREE.Sphere();
  area.boundingBox.getBoundingSphere(sphere);
  world.camera.controls.fitToSphere(sphere, true);
});

viewport.addEventListener("dblclick", () => {
  areaMeasurer.create();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Enter" || event.code === "NumpadEnter") {
    areaMeasurer.endCreation();
  }
});

// Define what happens when a fragments model has been loaded
fragments.list.onItemSet.add(async ({ value: model }) => {
  model.useCamera(world.camera.three);
  model.getClippingPlanesEvent = () => {
    return Array.from(world.renderer!.three.clippingPlanes) || [];
  };
  world.scene.three.add(model.object);
  await fragments.core.update(true);

  // Parse HK80 offset from IFC if not already set
  if (!hk80Offset) {
    try {
      const ifcResponse = await fetch("/water_mains.ifc");
      if (ifcResponse.ok) {
        const ifcContent = await ifcResponse.text();
        const parsed = parseHK80OffsetFromIFC(ifcContent);
        if (parsed) {
          hk80Offset = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to parse HK80 offset from IFC:", e);
    }
  }

  // Get flow meters coordinates
  const flowMeters = await getFlowMetersCoordinates(components);
  console.log("Flow meters coordinates:", flowMeters);

  // Create flow meter markers
  await createFlowMeterMarkers(components, world);

  // // Focus camera on the whole model

  const cameraParams = {
    position: [-100.02444471916911, 76.71981181813236, 147.52360266400538] as [
      number,
      number,
      number,
    ],
    target: [
      -0.9673284470144092, -300.029239272786138, -300.0409506923764018,
    ] as [number, number, number],
  };

  const controls = world.camera.controls;
  const currentDistance = 100;
  const newTarget = new THREE.Vector3(-116, 0, 30);
  const newPosition = new THREE.Vector3(-50, 70, 70);
  controls.setLookAt(
    newPosition.x,
    newPosition.y,
    newPosition.z,
    newTarget.x,
    newTarget.y,
    newTarget.z,
  );

  // world.camera.controls.setLookAt(
  //   ...cameraParams.position,
  //   ...cameraParams.target,
  // );
});

// Viewport Layouts
const [viewportSettings] = BUI.Component.create(viewportSettingsTemplate, {
  components,
  world,
});

viewport.append(viewportSettings);

// Viewport Layouts

const [viewportGrid] = BUI.Component.create(TEMPLATES.viewportGridTemplate, {
  components,
  world,
});

viewport.append(viewportGrid);

// Content Grid Setup
const viewportCardTemplate = () => BUI.html`
  <div class="dashboard-card" style="padding: 0px;">
    ${viewport}
  </div>
`;

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
  if (window.location.hash) {
    const hash = window.location.hash.slice(
      1,
    ) as TEMPLATES.ContentGridLayouts[number];
    if (Object.keys(contentGrid.layouts).includes(hash)) {
      contentGrid.layout = hash;
    } else {
      contentGrid.layout = "Viewer";
      window.location.hash = "Viewer";
    }
  } else {
    window.location.hash = "Viewer";
    contentGrid.layout = "Viewer";
  }
};

setInitialLayout();

contentGrid.addEventListener("layoutchange", () => {
  window.location.hash = contentGrid.layout as string;
});

const contentGridIcons: Record<TEMPLATES.ContentGridLayouts[number], string> = {
  Viewer: appIcons.MODEL,
};

// App Grid Setup
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
      layoutIcons: contentGridIcons,
    },
  },
  contentGrid,
};

contentGrid.addEventListener("layoutchange", () =>
  app.updateComponent.sidebar(),
);

app.layouts = {
  App: {
    template: `
      "sidebar contentGrid" 1fr
      /auto 1fr
    `,
  },
};

app.layout = "App";
