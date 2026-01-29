import { EnergyHistory, HistoryDataPoint } from "../types";
import { formatShortTime } from "../utils/format";
import { getConfig } from "../config";

// Graph dimensions
const GRAPH_WIDTH = 760;
const GRAPH_HEIGHT = 380;
const PADDING = { top: 20, right: 20, bottom: 50, left: 60 };
const PLOT_WIDTH = GRAPH_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = GRAPH_HEIGHT - PADDING.top - PADDING.bottom;

// Colors for each line
const COLORS = {
  pvPower: "#f59e0b", // Yellow/Orange for solar
  houseConsumption: "#3b82f6", // Blue for house
  gridPower: "#10b981", // Green for grid (will show red for export)
};

interface DataSeries {
  name: string;
  color: string;
  points: HistoryDataPoint[];
}

function getTimeRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

function calculateYAxisMax(history: EnergyHistory): number {
  let maxValue = 0;

  const allValues = [
    ...history.pvPower.map((p) => Math.abs(p.value)),
    ...history.houseConsumption.map((p) => Math.abs(p.value)),
    ...history.gridPower.map((p) => Math.abs(p.value)),
  ];

  if (allValues.length > 0) {
    maxValue = Math.max(...allValues);
  }

  // Round up to nice values and ensure minimum of 1000W
  maxValue = Math.max(maxValue, 1000);

  // Round to nearest 500W or 1kW depending on scale
  if (maxValue <= 2000) {
    return Math.ceil(maxValue / 500) * 500;
  } else if (maxValue <= 5000) {
    return Math.ceil(maxValue / 1000) * 1000;
  } else {
    return Math.ceil(maxValue / 2000) * 2000;
  }
}

function xScale(date: Date, timeRange: { start: Date; end: Date }): number {
  const totalMs = timeRange.end.getTime() - timeRange.start.getTime();
  const offsetMs = date.getTime() - timeRange.start.getTime();
  return PADDING.left + (offsetMs / totalMs) * PLOT_WIDTH;
}

function yScale(value: number, yMax: number): number {
  // Invert Y axis (SVG origin is top-left)
  const normalized = Math.abs(value) / yMax;
  return PADDING.top + PLOT_HEIGHT * (1 - normalized);
}

function renderPath(
  points: HistoryDataPoint[],
  timeRange: { start: Date; end: Date },
  yMax: number,
  color: string
): string {
  if (points.length === 0) return "";

  // Filter points within time range
  const filteredPoints = points.filter(
    (p) => p.timestamp >= timeRange.start && p.timestamp <= timeRange.end
  );

  if (filteredPoints.length === 0) return "";

  const pathData = filteredPoints
    .map((point, i) => {
      const x = xScale(point.timestamp, timeRange);
      const y = yScale(point.value, yMax);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderXAxis(timeRange: { start: Date; end: Date }): string {
  const lines: string[] = [];
  const labels: string[] = [];
  const config = getConfig();

  // Create time labels every 4 hours
  const labelCount = 7; // 0, 4, 8, 12, 16, 20, 24 hours
  const intervalMs = (timeRange.end.getTime() - timeRange.start.getTime()) / 6;

  for (let i = 0; i < labelCount; i++) {
    const time = new Date(timeRange.start.getTime() + i * intervalMs);
    const x = PADDING.left + (i / 6) * PLOT_WIDTH;
    const y = GRAPH_HEIGHT - PADDING.bottom;

    // Vertical grid line
    lines.push(
      `<line x1="${x}" y1="${PADDING.top}" x2="${x}" y2="${y}" stroke="#e5e5e5" stroke-width="1"/>`
    );

    // Time label
    const label = formatShortTime(time);
    labels.push(
      `<text x="${x}" y="${y + 25}" text-anchor="middle" font-size="14" fill="#666666">${label}</text>`
    );
  }

  // X-axis line
  lines.push(
    `<line x1="${PADDING.left}" y1="${GRAPH_HEIGHT - PADDING.bottom}" x2="${GRAPH_WIDTH - PADDING.right}" y2="${GRAPH_HEIGHT - PADDING.bottom}" stroke="#333333" stroke-width="2"/>`
  );

  return lines.join("\n") + "\n" + labels.join("\n");
}

function renderYAxis(yMax: number): string {
  const lines: string[] = [];
  const labels: string[] = [];

  // Create 5 horizontal grid lines
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const value = (yMax / steps) * i;
    const y = yScale(value, yMax);
    const x = PADDING.left;

    // Horizontal grid line
    if (i > 0) {
      lines.push(
        `<line x1="${x}" y1="${y}" x2="${GRAPH_WIDTH - PADDING.right}" y2="${y}" stroke="#e5e5e5" stroke-width="1"/>`
      );
    }

    // Value label
    const labelText = value >= 1000 ? `${(value / 1000).toFixed(1)}kW` : `${value}W`;
    labels.push(
      `<text x="${x - 8}" y="${y + 4}" text-anchor="end" font-size="14" fill="#666666">${labelText}</text>`
    );
  }

  // Y-axis line
  lines.push(
    `<line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${GRAPH_HEIGHT - PADDING.bottom}" stroke="#333333" stroke-width="2"/>`
  );

  return lines.join("\n") + "\n" + labels.join("\n");
}

function renderLegend(): string {
  const items = [
    { label: "Solar", color: COLORS.pvPower },
    { label: "House", color: COLORS.houseConsumption },
    { label: "Grid", color: COLORS.gridPower },
  ];

  const itemWidth = 100;
  const startX = GRAPH_WIDTH / 2 - (items.length * itemWidth) / 2;
  const y = GRAPH_HEIGHT - 15;

  return items
    .map((item, i) => {
      const x = startX + i * itemWidth;
      return `
        <line x1="${x}" y1="${y}" x2="${x + 24}" y2="${y}" stroke="${item.color}" stroke-width="3"/>
        <text x="${x + 32}" y="${y + 4}" font-size="14" fill="#333333">${item.label}</text>
      `;
    })
    .join("\n");
}

export function renderGraph(history: EnergyHistory): string {
  const timeRange = getTimeRange();
  const yMax = calculateYAxisMax(history);

  const series: DataSeries[] = [
    { name: "pvPower", color: COLORS.pvPower, points: history.pvPower },
    {
      name: "houseConsumption",
      color: COLORS.houseConsumption,
      points: history.houseConsumption,
    },
    { name: "gridPower", color: COLORS.gridPower, points: history.gridPower },
  ];

  const paths = series
    .map((s) => renderPath(s.points, timeRange, yMax, s.color))
    .join("\n");

  return `
    <svg width="${GRAPH_WIDTH}" height="${GRAPH_HEIGHT}" viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect x="0" y="0" width="${GRAPH_WIDTH}" height="${GRAPH_HEIGHT}" fill="#ffffff"/>

      <!-- Grid and Axes -->
      ${renderYAxis(yMax)}
      ${renderXAxis(timeRange)}

      <!-- Data Lines -->
      ${paths}

      <!-- Legend -->
      ${renderLegend()}
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
