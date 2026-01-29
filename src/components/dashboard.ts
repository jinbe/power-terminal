import { DashboardData } from "../types";
import { renderMetricsBar, getMetricsStyles } from "./metrics";
import { renderGraph, getGraphStyles } from "./graph";

export function renderDashboard(data: DashboardData): string {
  const metricsBar = renderMetricsBar(data.metrics);
  const graph = renderGraph(data.history);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=800, height=480, initial-scale=1.0">
  <title>Power Terminal</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 800px;
      height: 480px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #000000;
    }

    .container {
      width: 800px;
      height: 480px;
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
