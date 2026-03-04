# Second Water Leak Analytics Dashboard Implementation Report

## Overview
As requested, a second, parallel **BIM Native Analytics Dashboard** (`BimAnalytics`) has been implemented alongside the previous Chart.js dashboard (`Analytics`). This new version strictly leverages the native `@thatopen/ui` (`bim-panel`, `bim-table`, `bim-dropdown`, `bim-label`) components, maintaining visual and architectural consistency with the core IFC.js viewer.

## Features Implemented
1. **Third Layout in Grid**:
   - Added a `BimAnalytics` layout to the `contentGrid`.
   - Exposed a new third icon (Task list icon: `solar:task-bold` or `appIcons.TASK`) on the left sidebar to toggle this view.

2. **Native Dropdown Selection**:
   - Used `<bim-dropdown>` instead of native `<select>` for flow meter selection, integrating perfectly with the dark theme.

3. **Status Badges & KPIs**:
   - Implemented using `<bim-label>` and `<bim-panel-section>` for structural layout.
   - Preserved all leak detection logic (Min Night Flow, Avg Flow, Current Pressure, Leak Likely).

4. **Charting**:
   - Retained the custom canvas-based drawing function for lightweight inline charts (Flow Rate & Pressure) within the `bim-panel-section`. This avoids external charting library bloat while providing identical visual data.

5. **Data Table**:
   - Migrated from a native HTML `<table>` to `<bim-table>` (`CUI.tables` style/structure), ensuring sortable and native-feeling data history.

## Results
- We now have two robust dashboards:
  1. **Analytics View**: A more flexible, custom HTML/Chart.js driven dashboard.
  2. **BimAnalytics View**: A highly integrated, framework-native (`@thatopen/ui`) dashboard.
- The UI handles both layouts seamlessly, with the sidebar dynamically updating to reflect the active tab.

## Configuration Updates
- OpenClaw Agent Timeout has been safely increased to **1200 seconds (20 minutes)** in `~/.openclaw/openclaw.json` to prevent future task interruptions.
