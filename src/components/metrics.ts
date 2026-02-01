import { EnergyMetrics } from "../types";
import { formatPower, formatPercent, formatTime } from "../utils/format";

export interface MetricItem {
  emoji: string;
  label: string;
  value: string;
  color?: string;
}

export function getMetricItems(metrics: EnergyMetrics): MetricItem[] {
  return [
    {
      emoji: "🔋",
      label: "Battery",
      value: formatPercent(metrics.batterySoc),
      color: getBatteryColor(metrics.batterySoc),
    },
    {
      emoji: "☀️",
      label: "Solar",
      value: formatPower(metrics.pvPower),
      color: metrics.pvPower && metrics.pvPower > 0 ? "#f59e0b" : "#666666",
    },
    {
      emoji: "🏠",
      label: "House",
      value: formatPower(metrics.houseConsumption),
      color: "#3b82f6",
    },
    {
      emoji: "⚡",
      label: "Grid",
      value: formatPower(metrics.gridPower),
      color: getGridColor(metrics.gridPower),
    },
    {
      emoji: "🚗",
      label: "Car",
      value: formatPower(metrics.carChargerPower),
      color: getCarColor(metrics.carChargerSwitch),
    },
  ];
}

function getGridColor(power: number | null): string {
  if (power === null) return "#666666";
  if (power > 0) return "#10b981"; // Green - importing
  if (power < 0) return "#ef4444"; // Red - exporting
  return "#666666";
}

function getBatteryColor(soc: number | null): string {
  if (soc === null) return "#666666";
  if (soc >= 60) return "#22c55e"; // Green
  if (soc >= 30) return "#f59e0b"; // Orange
  return "#ef4444"; // Red
}

function getCarColor(switchState: boolean | null): string {
  if (switchState === null) return "#666666";
  if (switchState) return "#22c55e"; // Green when on
  return "#ef4444"; // Red when off
}

export function renderMetricsBar(metrics: EnergyMetrics): string {
  const items = getMetricItems(metrics);
  const timeStr = formatTime(metrics.timestamp);

  const metricsHtml = items
    .map(
      (item) => `
      <div class="metric-item">
        <span class="metric-emoji">${item.emoji}</span>
        <span class="metric-value" style="color: ${item.color || "#000000"}">${item.value}</span>
      </div>
    `
    )
    .join("");

  return `
    <div class="metrics-bar">
      <div class="metrics-left">
        ${metricsHtml}
      </div>
      <div class="metrics-time">${timeStr}</div>
    </div>
  `;
}

export function getMetricsStyles(): string {
  return `
    .metrics-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: #f8f8f8;
      border-bottom: 3px solid #000000;
    }

    .metrics-left {
      display: flex;
      gap: 20px;
    }

    .metric-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .metric-emoji {
      font-size: 24px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
    }

    .metrics-time {
      font-size: 24px;
      font-weight: 600;
      color: #333333;
    }
  `;
}
