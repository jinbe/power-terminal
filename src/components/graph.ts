import { EnergyHistory, HistoryDataPoint } from "../types";
import { getConfig, DisplayMode } from "../config";
import { formatShortTime } from "../utils/format";

const PADDING = { top: 20, right: 20, bottom: 50, left: 60 };

// Color palettes for different display modes
const COLOR_PALETTES: Record<DisplayMode, { pvPower: string; houseConsumption: string; gridPower: string; carChargerPower: string }> = {
  color: {
    pvPower: "#f59e0b", // Yellow/Orange for solar
    houseConsumption: "#3b82f6", // Blue for house
    gridPower: "#10b981", // Green for grid
    carChargerPower: "#8b5cf6", // Purple for car
  },
  grayscale: {
    pvPower: "#666666",
    houseConsumption: "#999999",
    gridPower: "#333333",
    carChargerPower: "#4a4a4a",
  },
  bw: {
    pvPower: "#000000",
    houseConsumption: "#000000",
    gridPower: "#000000",
    carChargerPower: "#000000",
  },
};

interface GraphDimensions {
  width: number;
  height: number;
  plotWidth: number;
  plotHeight: number;
}

interface DataSeries {
  name: string;
  color: string;
  points: HistoryDataPoint[];
  dashArray?: string;
}

interface YAxisRange {
  min: number;
  max: number;
}

function getGraphDimensions(): GraphDimensions {
  const config = getConfig();
  // Graph takes up most of the display, with some margin
  const width = config.display.width - 40;
  const height = config.display.height - 100; // Leave room for metrics bar
  return {
    width,
    height,
    plotWidth: width - PADDING.left - PADDING.right,
    plotHeight: height - PADDING.top - PADDING.bottom,
  };
}

function getColors() {
  const config = getConfig();
  return COLOR_PALETTES[config.display.mode];
}

function getTimeRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

function roundToNiceValue(value: number): number {
  const absValue = Math.abs(value);
  if (absValue <= 2000) {
    return Math.ceil(absValue / 500) * 500 * Math.sign(value || 1);
  } else if (absValue <= 5000) {
    return Math.ceil(absValue / 1000) * 1000 * Math.sign(value || 1);
  } else {
    return Math.ceil(absValue / 2000) * 2000 * Math.sign(value || 1);
  }
}

function calculateYAxisRange(history: EnergyHistory): YAxisRange {
  const allValues = [
    ...history.pvPower.map((p) => p.value),
    ...history.houseConsumption.map((p) => p.value),
    ...history.gridPower.map((p) => p.value),
    ...history.carChargerPower.map((p) => p.value),
  ];

  if (allValues.length === 0) {
    return { min: 0, max: 1000 };
  }

  let maxValue = Math.max(...allValues, 0);
  let minValue = Math.min(...allValues, 0);

  // Ensure minimum range
  maxValue = Math.max(maxValue, 1000);

  // Round to nice values
  maxValue = roundToNiceValue(maxValue);
  minValue = minValue < 0 ? roundToNiceValue(minValue) : 0;

  return { min: minValue, max: maxValue };
}

function xScale(date: Date, timeRange: { start: Date; end: Date }, dims: GraphDimensions): number {
  const totalMs = timeRange.end.getTime() - timeRange.start.getTime();
  const offsetMs = date.getTime() - timeRange.start.getTime();
  return PADDING.left + (offsetMs / totalMs) * dims.plotWidth;
}

function yScale(value: number, yRange: YAxisRange, dims: GraphDimensions): number {
  // Map value to Y coordinate (SVG origin is top-left)
  // max -> PADDING.top, min -> PADDING.top + plotHeight
  const range = yRange.max - yRange.min;
  const normalized = (value - yRange.min) / range;
  return PADDING.top + dims.plotHeight * (1 - normalized);
}

function renderPath(
  points: HistoryDataPoint[],
  timeRange: { start: Date; end: Date },
  yRange: YAxisRange,
  color: string,
  dims: GraphDimensions,
  dashArray?: string
): string {
  if (points.length === 0) return "";

  // Filter points within time range
  const filteredPoints = points.filter(
    (p) => p.timestamp >= timeRange.start && p.timestamp <= timeRange.end
  );

  if (filteredPoints.length === 0) return "";

  const pathData = filteredPoints
    .map((point, i) => {
      const x = xScale(point.timestamp, timeRange, dims);
      const y = yScale(point.value, yRange, dims);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const dashAttr = dashArray ? ` stroke-dasharray="${dashArray}"` : "";
  return `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>`;
}

function renderXAxis(timeRange: { start: Date; end: Date }, yRange: YAxisRange, dims: GraphDimensions): string {
  const lines: string[] = [];
  const labels: string[] = [];

  // Create time labels every 4 hours
  const labelCount = 7;
  const intervalMs = (timeRange.end.getTime() - timeRange.start.getTime()) / 6;

  // Position X-axis at y=0 if we have negative values, otherwise at bottom
  const xAxisY = yRange.min < 0 ? yScale(0, yRange, dims) : dims.height - PADDING.bottom;

  for (let i = 0; i < labelCount; i++) {
    const time = new Date(timeRange.start.getTime() + i * intervalMs);
    const x = PADDING.left + (i / 6) * dims.plotWidth;

    // Vertical grid line (full height)
    lines.push(
      `<line x1="${x}" y1="${PADDING.top}" x2="${x}" y2="${dims.height - PADDING.bottom}" stroke="#e5e5e5" stroke-width="1"/>`
    );

    // Time label at bottom
    const labelY = dims.height - PADDING.bottom + 25;
    const label = formatShortTime(time);
    labels.push(
      `<text x="${x}" y="${labelY}" text-anchor="middle" font-size="14" fill="#666666">${label}</text>`
    );
  }

  // X-axis line at zero
  lines.push(
    `<line x1="${PADDING.left}" y1="${xAxisY}" x2="${dims.width - PADDING.right}" y2="${xAxisY}" stroke="#333333" stroke-width="2"/>`
  );

  return lines.join("\n") + "\n" + labels.join("\n");
}

function renderYAxis(yRange: YAxisRange, dims: GraphDimensions): string {
  const lines: string[] = [];
  const labels: string[] = [];

  const range = yRange.max - yRange.min;
  const steps = 5;
  const stepSize = range / steps;

  for (let i = 0; i <= steps; i++) {
    const value = yRange.min + stepSize * i;
    const y = yScale(value, yRange, dims);
    const x = PADDING.left;

    // Horizontal grid line
    lines.push(
      `<line x1="${x}" y1="${y}" x2="${dims.width - PADDING.right}" y2="${y}" stroke="${value === 0 ? '#999999' : '#e5e5e5'}" stroke-width="${value === 0 ? 1.5 : 1}"/>`
    );

    // Value label
    const absValue = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    const labelText = absValue >= 1000 ? `${sign}${(absValue / 1000).toFixed(1)}kW` : `${sign}${Math.round(absValue)}W`;
    labels.push(
      `<text x="${x - 8}" y="${y + 4}" text-anchor="end" font-size="14" fill="#666666">${labelText}</text>`
    );
  }

  // Y-axis line
  lines.push(
    `<line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${dims.height - PADDING.bottom}" stroke="#333333" stroke-width="2"/>`
  );

  return lines.join("\n") + "\n" + labels.join("\n");
}

function renderLegend(dims: GraphDimensions): string {
  const colors = getColors();
  const config = getConfig();

  // In B&W mode, use different dash patterns to distinguish lines
  const items = config.display.mode === "bw"
    ? [
        { label: "Solar", color: colors.pvPower, dash: "" },
        { label: "House", color: colors.houseConsumption, dash: "8,4" },
        { label: "Grid", color: colors.gridPower, dash: "2,2" },
        { label: "Car", color: colors.carChargerPower, dash: "4,2,1,2" },
      ]
    : [
        { label: "Solar", color: colors.pvPower, dash: "" },
        { label: "House", color: colors.houseConsumption, dash: "" },
        { label: "Grid", color: colors.gridPower, dash: "" },
        { label: "Car", color: colors.carChargerPower, dash: "" },
      ];

  const itemWidth = 80;
  const startX = dims.width / 2 - (items.length * itemWidth) / 2;
  const y = dims.height - 15;

  return items
    .map((item, i) => {
      const x = startX + i * itemWidth;
      const dashAttr = item.dash ? ` stroke-dasharray="${item.dash}"` : "";
      return `
        <line x1="${x}" y1="${y}" x2="${x + 20}" y2="${y}" stroke="${item.color}" stroke-width="3"${dashAttr}/>
        <text x="${x + 26}" y="${y + 4}" font-size="12" fill="#333333">${item.label}</text>
      `;
    })
    .join("\n");
}

export function renderGraph(history: EnergyHistory): string {
  const dims = getGraphDimensions();
  const colors = getColors();
  const config = getConfig();
  const timeRange = getTimeRange();
  const yRange = calculateYAxisRange(history);

  // In B&W mode, use dash patterns to distinguish lines
  const series: DataSeries[] = config.display.mode === "bw"
    ? [
        { name: "pvPower", color: colors.pvPower, points: history.pvPower },
        { name: "houseConsumption", color: colors.houseConsumption, points: history.houseConsumption, dashArray: "8,4" },
        { name: "gridPower", color: colors.gridPower, points: history.gridPower, dashArray: "2,2" },
        { name: "carChargerPower", color: colors.carChargerPower, points: history.carChargerPower, dashArray: "4,2,1,2" },
      ]
    : [
        { name: "pvPower", color: colors.pvPower, points: history.pvPower },
        { name: "houseConsumption", color: colors.houseConsumption, points: history.houseConsumption },
        { name: "gridPower", color: colors.gridPower, points: history.gridPower },
        { name: "carChargerPower", color: colors.carChargerPower, points: history.carChargerPower },
      ];

  const paths = series
    .map((s) => renderPath(s.points, timeRange, yRange, s.color, dims, s.dashArray))
    .join("\n");

  return `
    <svg width="${dims.width}" height="${dims.height}" viewBox="0 0 ${dims.width} ${dims.height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect x="0" y="0" width="${dims.width}" height="${dims.height}" fill="#ffffff"/>

      <!-- Grid and Axes -->
      ${renderYAxis(yRange, dims)}
      ${renderXAxis(timeRange, yRange, dims)}

      <!-- Data Lines -->
      ${paths}

      <!-- Legend -->
      ${renderLegend(dims)}
    </svg>
  `;
}

export function getGraphStyles(): string {
  return `
    .graph-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
    }

    .graph-container svg {
      max-width: 100%;
      height: auto;
    }
  `;
}
