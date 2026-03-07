# BIM Digital Twin with DMA/PMA Analytics

A 3D Building Information Modeling (BIM) digital twin application for water network visualization with real-time DMA (District Metered Area) and PMA (Pressure Management Area) flow meter analytics.

## Features

- **3D Model Viewer** - Interactive BIM model viewer powered by ThatOpen
- **DMA/PMA Analytics Dashboard** - Real-time flow meter data visualization
- **IoT Integration** - Live sensor data from flow meters and pressure sensors
- **Measurement Tools** - Length and area measurement on 3D models
- **Section/Clipping** - Model cross-section views
- **Simulation Mode** - Configurable IoT data simulation interval

## Tech Stack

- **Frontend**: TypeScript, Vite, ThatOpen (BimViewer, Components, UI)
- **3D Engine**: Three.js
- **Charts**: Chart.js
- **Backend Simulation**: Node.js

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Running the IoT Simulation

```bash
npm run simulation
```

## Deployment

### Vercel

Deploy directly to Vercel:

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Usage

1. **Navigation**: Use mouse to rotate, pan, and zoom the 3D model
2. **Analytics Dashboard**: Click the chart icon in the sidebar to view DMA/PMA analytics
3. **Measurements**: Click the ruler icon → select Length/Area → double-click on model to measure
4. **Section View**: Click the clipping icon → double-click on model to create a cross-section
5. **Simulation**: Adjust the IoT data refresh interval using the simulation slider

## License

MIT License - see LICENSE file for details.
