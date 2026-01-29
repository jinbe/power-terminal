import { DashboardData } from "../types";
import { getConfig } from "../config";
import { renderMetricsBar, getMetricsStyles } from "./metrics";
import { renderGraph, getGraphStyles } from "./graph";

export function renderDashboard(data: DashboardData): string {
  const config = getConfig();
  const { width, height } = config.display;

  const metricsBar = renderMetricsBar(data.metrics);
  const graph = renderGraph(data.history);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}, initial-scale=1.0">
  <title>Power Terminal</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #000000;
    }

    .container {
      width: ${width}px;
      height: ${height}px;
      display: flex;
      flex-direction: column;
    }

    ${getMetricsStyles()}
    ${getGraphStyles()}
  </style>
</head>
<body>
  <div class="container">
    ${metricsBar}
    <div class="graph-container">
      ${graph}
    </div>
  </div>
</body>
</html>`;
}
