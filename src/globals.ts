export const CONTENT_GRID_ID = "app-content";
export const CONTENT_GRID_GAP = "1rem";

export const appIcons = {
  ADD: "mdi:plus",
  SELECT: "solar:cursor-bold",
  CLIPPING: "fluent:cut-16-filled",
  SHOW: "mdi:eye",
  HIDE: "mdi:eye-off",
  LEFT: "tabler:chevron-compact-left",
  RIGHT: "tabler:chevron-compact-right",
  SETTINGS: "solar:settings-bold",
  COLORIZE: "famicons:color-fill",
  EXPAND: "eva:expand-fill",
  EXPORT: "ph:export-fill",
  TASK: "material-symbols:task",
  CAMERA: "solar:camera-bold",
  FOCUS: "ri:focus-mode",
  TRANSPARENT: "mdi:ghost",
  ISOLATE: "mdi:selection-ellipse",
  RULER: "solar:ruler-bold",
  MODEL: "mage:box-3d-fill",
  LAYOUT: "tabler:layout-filled",
  COLLAPSE: "tabler:chevron-compact-right",
  DARK: "tabler:moon-filled",
  LIGHT: "tabler:sun-filled",
  SEARCH: "tabler:search",
  CHART: "solar:chart-bold",
  GRID: "mdi:grid",
  MARKER: "mdi:map-marker",
  SIMULATION: "mdi:speedometer",
};

export const tooltips = {
  FOCUS: {
    TITLE: "Items Focusing",
    TEXT: "Move the camera to focus the selected items. If no items are selected, all models will be focused.",
  },
  HIDE: {
    TITLE: "Hide Selection",
    TEXT: "Hide the currently selected items.",
  },
  ISOLATE: {
    TITLE: "Isolate Selection",
    TEXT: "Hide everything expect the currently selected items.",
  },
  GHOST: {
    TITLE: "Ghost Mode",
    TEXT: "Set all models transparent, so selections and colors can be seen better.",
  },
  SHOW_ALL: {
    TITLE: "Show All Items",
    TEXT: "Reset the visibility of all hidden items, so they become visible again.",
  },
  GRID: {
    TITLE: "Toggle Grid",
    TEXT: "Toggle the visibility of the grid in the viewport.",
  },
  MARKERS: {
    TITLE: "Toggle Markers",
    TEXT: "Toggle the visibility of the markers in the viewport.",
  },
  FILTER: {
    TITLE: "Toggle Filter",
    TEXT: "Show or hide the filter panel.",
  },
  SIMULATION: {
    TITLE: "Live Data Updates",
    TEXT: "Turn live updates on or off with a click. Use the slider to choose how often you want to see new data—faster for real-time views, or slower to keep the screen steady.",
  },
};
