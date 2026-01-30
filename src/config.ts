// Configuration loaded from environment variables

export type DisplayMode = "color" | "grayscale" | "bw";

export interface Config {
  haUrl: string;
  haToken: string;
  timezone: string;
  apiKey: string | null;
  entities: {
    pvPower: string;
    batterySoc: string;
    gridPower: string;
    houseConsumption: string;
  };
  display: {
    width: number;
    height: number;
    mode: DisplayMode;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function optionalEnvInt(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseDisplayMode(value: string): DisplayMode {
  const normalized = value.toLowerCase();
  if (normalized === "grayscale" || normalized === "grey" || normalized === "gray") {
    return "grayscale";
  }
  if (normalized === "bw" || normalized === "blackwhite" || normalized === "monochrome") {
    return "bw";
  }
  return "color";
}

export function loadConfig(): Config {
  return {
    haUrl: requireEnv("HA_URL").replace(/\/$/, ""), // Remove trailing slash
    haToken: requireEnv("HA_TOKEN"),
    timezone: optionalEnv("TZ", "UTC"),
    apiKey: process.env.API_KEY || null,
    entities: {
      pvPower: optionalEnv("HA_ENTITY_PV_POWER", "sensor.pv_power"),
      batterySoc: optionalEnv(
        "HA_ENTITY_BATTERY_SOC",
        "sensor.battery_state_of_charge"
      ),
      gridPower: optionalEnv("HA_ENTITY_GRID_POWER", "sensor.active_power"),
      houseConsumption: optionalEnv(
        "HA_ENTITY_HOUSE_CONSUMPTION",
        "sensor.house_consumption"
      ),
    },
    display: {
      width: optionalEnvInt("DISPLAY_WIDTH", 800),
      height: optionalEnvInt("DISPLAY_HEIGHT", 480),
      mode: parseDisplayMode(optionalEnv("DISPLAY_MODE", "color")),
    },
  };
}

// Singleton config instance
let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}
