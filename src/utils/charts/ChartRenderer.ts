import { HistoricalDataPoint } from "../../types";
import { CHART_CONFIG, MARKER_CONFIG } from "../../config/appConfig";

export function createSmallChart(
  history: HistoricalDataPoint[],
  type: "flowRate" | "flowPressure",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CHART_CONFIG.small.width;
  canvas.height = CHART_CONFIG.small.height;
  const ctx = canvas.getContext("2d")!;

  const isDark = document.documentElement.classList.contains("bim-ui-dark");
  const bgColor = isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)";
  const textColor = isDark
    ? CHART_CONFIG.colors.text
    : CHART_CONFIG.colors.textDark;

  if (history.length < 2) {
    ctx.fillStyle = textColor;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data yet", canvas.width / 2, canvas.height / 2);
    return canvas;
  }

  const values = history.map((h) => h[type]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = CHART_CONFIG.small.padding;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= CHART_CONFIG.gridLines; i++) {
    const y = padding + (chartHeight / CHART_CONFIG.gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  const color =
    type === "flowRate"
      ? MARKER_CONFIG.colors.flowRate
      : MARKER_CONFIG.colors.pressure;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < values.length; i++) {
    const x = padding + (i / (values.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((values[i] - min) / range) * chartHeight;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.lineTo(padding + chartWidth, padding + chartHeight);
  ctx.lineTo(padding, padding + chartHeight);
  ctx.closePath();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = textColor;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(max.toFixed(0), 2, padding + 8);
  ctx.fillText(min.toFixed(0), 2, canvas.height - 4);

  return canvas;
}

export function createLargeChart(
  history: HistoricalDataPoint[],
  type: "flowRate" | "flowPressure",
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "200px";
  container.style.overflow = "hidden";

  const canvas = document.createElement("canvas");
  canvas.width = CHART_CONFIG.large.width;
  canvas.height = CHART_CONFIG.large.height;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.objectFit = "fill";
  container.appendChild(canvas);

  const tooltip = document.createElement("div");
  tooltip.style.cssText = `
    position: absolute;
    display: none;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 10;
    border: 1px solid #555;
  `;
  container.appendChild(tooltip);

  const ctx = canvas.getContext("2d")!;

  const draw = () => {
    const width = canvas.width;
    const height = canvas.height;

    if (history.length < 2) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Insufficient data for chart", width / 2, height / 2);
      return;
    }

    const values = history.map((h) => h[type]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = CHART_CONFIG.large.padding;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= CHART_CONFIG.gridLines; i++) {
      const y = padding + (chartHeight / CHART_CONFIG.gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    const color =
      type === "flowRate"
        ? MARKER_CONFIG.colors.flowRate
        : MARKER_CONFIG.colors.pressure;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i < values.length; i++) {
      const x = padding + (i / (values.length - 1)) * chartWidth;
      const y =
        padding + chartHeight - ((values[i] - min) / range) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = CHART_CONFIG.colors.text;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(max.toFixed(1), padding, padding + 15);
    ctx.fillText(min.toFixed(1), padding, height - 10);
  };

  canvas.onmousemove = (e) => {
    if (history.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const padding = CHART_CONFIG.large.padding;
    const chartWidth = canvas.width - padding * 2;

    const index = Math.round(
      ((x - padding) / chartWidth) * (history.length - 1),
    );
    if (index >= 0 && index < history.length) {
      const point = history[index];

      tooltip.style.display = "block";
      tooltip.style.left = `${e.clientX - rect.left + 10}px`;
      tooltip.style.top = `${e.clientY - rect.top - 30}px`;

      const time = new Date(point.timestamp).toLocaleTimeString();
      const value =
        type === "flowRate"
          ? point.flowRate.toFixed(1)
          : point.flowPressure.toFixed(2);
      const unit = type === "flowRate" ? "L/min" : "bar";
      tooltip.innerHTML = `<strong>${time}</strong><br/>${value} ${unit}`;
    }
  };

  canvas.onmouseout = () => {
    tooltip.style.display = "none";
  };

  draw();
  return container;
}
