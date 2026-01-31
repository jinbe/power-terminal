import { getConfig } from "../config";
import {
  HAState,
  HAHistoryEntry,
  HAError,
  EnergyMetrics,
  EnergyHistory,
  HistoryDataPoint,
  DashboardData,
} from "../types";

const TIMEOUT_MS = 10000;

async function fetchHA<T>(endpoint: string): Promise<T> {
  const config = getConfig();
  const url = `${config.haUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.haToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      throw new HAError("auth", "Authentication failed - check HA_TOKEN");
    }

    if (response.status === 404) {
      throw new HAError("not_found", `Endpoint not found: ${endpoint}`);
    }

    if (!response.ok) {
      throw new HAError(
        "unknown",
        `Home Assistant returned status ${response.status}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof HAError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new HAError("timeout", "Home Assistant not responding (timeout)");
      }

      if (
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND")
      ) {
        throw new HAError(
          "network",
          "Unable to connect to Home Assistant"
        );
      }
    }

    throw new HAError("unknown", `Unexpected error: ${error}`);
  }
}

export async function fetchEntityState(entityId: string): Promise<HAState> {
  const state = await fetchHA<HAState>(`/api/states/${entityId}`);

  if (!state || !state.entity_id) {
    throw new HAError("not_found", `Entity not found: ${entityId}`);
  }

  return state;
}

export async function fetchEntityHistory(
  entityIds: string[],
  hours: number = 24
): Promise<HAHistoryEntry[][]> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
  const startIso = startTime.toISOString();
  const entityFilter = entityIds.join(",");

  const history = await fetchHA<HAHistoryEntry[][]>(
    `/api/history/period/${startIso}?filter_entity_id=${entityFilter}&minimal_response&no_attributes`
  );

  return history;
}

function parseStateValue(state: HAState): number | null {
  if (
    state.state === "unavailable" ||
    state.state === "unknown" ||
    state.state === ""
  ) {
    return null;
  }

  const value = parseFloat(state.state);
  return isNaN(value) ? null : value;
}

function downsampleHistory(
  entries: HAHistoryEntry[],
  maxPoints: number = 288
): HistoryDataPoint[] {
  if (entries.length === 0) return [];

  // Parse all entries
  const points: HistoryDataPoint[] = entries
    .map((entry) => {
      const value = parseFloat(entry.state);
      if (isNaN(value) || entry.state === "unavailable" || entry.state === "unknown") {
        return null;
      }
      return {
        timestamp: new Date(entry.last_changed),
        value,
      };
    })
    .filter((p): p is HistoryDataPoint => p !== null);

  if (points.length <= maxPoints) {
    return points;
  }

  // Downsample by averaging into buckets
  const bucketSize = Math.ceil(points.length / maxPoints);
  const downsampled: HistoryDataPoint[] = [];

  for (let i = 0; i < points.length; i += bucketSize) {
    const bucket = points.slice(i, i + bucketSize);
    const avgValue =
      bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length;
    const midTimestamp = bucket[Math.floor(bucket.length / 2)].timestamp;

    downsampled.push({
      timestamp: midTimestamp,
      value: avgValue,
    });
  }

  return downsampled;
}

export async function fetchCurrentMetrics(): Promise<EnergyMetrics> {
  const config = getConfig();
  const entities = config.entities;

  // Fetch all states in parallel
  const [pvState, batteryState, gridState, houseState, carChargerState, carChargerSwitchState] = await Promise.all([
    fetchEntityState(entities.pvPower),
    fetchEntityState(entities.batterySoc),
    fetchEntityState(entities.gridPower),
    fetchEntityState(entities.houseConsumption),
    fetchEntityState(entities.carChargerPower),
    fetchEntityState(entities.carChargerSwitch),
  ]);

  return {
    pvPower: parseStateValue(pvState),
    batterySoc: parseStateValue(batteryState),
    gridPower: parseStateValue(gridState),
    houseConsumption: parseStateValue(houseState),
    carChargerPower: parseStateValue(carChargerState),
    carChargerSwitch: carChargerSwitchState.state === "on" ? true : carChargerSwitchState.state === "off" ? false : null,
    timestamp: new Date(),
  };
}

export async function fetchHistoryData(): Promise<EnergyHistory> {
  const config = getConfig();
  const entities = config.entities;

  const entityIds = [
    entities.pvPower,
    entities.gridPower,
    entities.houseConsumption,
    entities.carChargerPower,
  ];

  const history = await fetchEntityHistory(entityIds, 24);

  // Map history arrays to their respective entities
  const historyMap = new Map<string, HAHistoryEntry[]>();
  for (const entityHistory of history) {
    if (entityHistory.length > 0) {
      historyMap.set(entityHistory[0].entity_id, entityHistory);
    }
  }

  return {
    pvPower: downsampleHistory(historyMap.get(entities.pvPower) || []),
    gridPower: downsampleHistory(historyMap.get(entities.gridPower) || []),
    houseConsumption: downsampleHistory(
      historyMap.get(entities.houseConsumption) || []
    ),
    carChargerPower: downsampleHistory(
      historyMap.get(entities.carChargerPower) || []
    ),
  };
}

export async function fetchDashboardData(): Promise<DashboardData> {
  // Fetch metrics and history in parallel
  const [metrics, history] = await Promise.all([
    fetchCurrentMetrics(),
    fetchHistoryData(),
  ]);

  return { metrics, history };
}
