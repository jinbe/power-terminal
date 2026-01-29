import { HAError, HAErrorType } from "../types";

function getErrorMessage(error: HAError): { title: string; detail: string } {
  const messages: Record<HAErrorType, { title: string; detail: string }> = {
    network: {
      title: "Connection Failed",
      detail: "Unable to connect to Home Assistant",
    },
    auth: {
      title: "Authentication Failed",
      detail: "Check your HA_TOKEN configuration",
    },
    not_found: {
      title: "Entity Not Found",
      detail: error.message,
    },
    unavailable: {
      title: "Data Unavailable",
      detail: "Home Assistant data is currently unavailable",
    },
    timeout: {
      title: "Request Timeout",
      detail: "Home Assistant is not responding",
    },
    unknown: {
      title: "Error",
      detail: error.message,
    },
  };

  return messages[error.type] || messages.unknown;
}

export function renderErrorScreen(error: HAError): string {
  const { title, detail } = getErrorMessage(error);
  // Use simple time format - don't depend on config for error screen
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=800, height=480, initial-scale=1.0">
  <title>Power Terminal - Error</title>
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
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .error-icon {
      font-size: 80px;
      margin-bottom: 24px;
    }

    .error-title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #dc2626;
    }

    .error-detail {
      font-size: 24px;
      color: #666666;
      margin-bottom: 32px;
      max-width: 600px;
    }

    .error-time {
      font-size: 18px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">⚠️</div>
    <h1 class="error-title">${title}</h1>
    <p class="error-detail">${detail}</p>
    <p class="error-time">${timeStr}</p>
  </div>
</body>
</html>`;
}
