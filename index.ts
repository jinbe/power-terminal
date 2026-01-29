import { fetchDashboardData } from "./src/services/homeAssistant";
import { renderDashboard } from "./src/components/dashboard";
import { renderErrorScreen } from "./src/components/error";
import { HAError } from "./src/types";

function getErrorFromException(error: unknown): HAError {
  if (error instanceof HAError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  // Check for missing config errors
  if (message.includes("Missing required environment variable")) {
    return new HAError("unknown", message.replace("Missing required environment variable: ", "Missing config: "));
  }

  return new HAError("unknown", message);
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      try {
        const data = await fetchDashboardData();
        return new Response(renderDashboard(data), {
          headers: { "Content-Type": "text/html" },
        });
      } catch (error) {
        console.error("Dashboard error:", error);

        return new Response(renderErrorScreen(getErrorFromException(error)), {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Power Terminal running at http://localhost:${server.port}`);
