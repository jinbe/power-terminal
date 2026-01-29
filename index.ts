const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(renderPage(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

function renderPage(): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
      padding: 32px;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #000000;
    }

    .time {
      font-size: 64px;
      font-weight: 700;
      letter-spacing: -2px;
    }

    .date {
      font-size: 20px;
      font-weight: 500;
      text-align: right;
      color: #333333;
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #000000;
    }

    .subtitle {
      font-size: 24px;
      font-weight: 400;
      color: #444444;
      margin-bottom: 32px;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .status-item {
      background: #f5f5f5;
      border: 2px solid #000000;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .status-label {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666666;
      margin-bottom: 8px;
    }

    .status-value {
      font-size: 28px;
      font-weight: 700;
      color: #000000;
    }

    .status-value.good {
      color: #2e7d32;
    }

    .status-value.warning {
      color: #f57c00;
    }

    .footer {
      margin-top: auto;
      padding-top: 16px;
      border-top: 2px solid #cccccc;
      font-size: 14px;
      color: #666666;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="time">${timeStr}</div>
      <div class="date">${dateStr}</div>
    </header>

    <main class="main">
      <h1 class="title">Power Terminal</h1>
      <p class="subtitle">System Status Dashboard</p>

      <div class="status-grid">
        <div class="status-item">
          <div class="status-label">System</div>
          <div class="status-value good">Online</div>
        </div>
        <div class="status-item">
          <div class="status-label">Network</div>
          <div class="status-value good">Connected</div>
        </div>
        <div class="status-item">
          <div class="status-label">Services</div>
          <div class="status-value good">Running</div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <span>Bun Server v1.0</span>
      <span>800 x 480 E-Paper Display</span>
    </footer>
  </div>
</body>
</html>`;
}

console.log(`Server running at http://localhost:${server.port}`);
