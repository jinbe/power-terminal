// Configuration loaded from environment variables

export interface Config {
  haUrl: string;
  haToken: string;
  timezone: string;
  entities: {
    pvPower: string;
    batterySoc: string;
    gridPower: string;
    houseConsumption: string;
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

export function loadConfig(): Config {
  return {
    haUrl: requireEnv("HA_URL").replace(/\/$/, ""), // Remove trailing slash
    haToken: requireEnv("HA_TOKEN"),
    timezone: optionalEnv("TZ", "UTC"),
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
