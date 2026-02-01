// Home Assistant API types

export interface HAState {
  entity_id: string;
  state: string;
  attributes: {
    unit_of_measurement?: string;
    friendly_name?: string;
    device_class?: string;
    [key: string]: unknown;
  };
  last_changed: string;
  last_updated: string;
}

export interface HAHistoryEntry {
  entity_id: string;
  state: string;
  last_changed: string;
}

// Processed energy data types

export interface EnergyMetrics {
  pvPower: number | null; // Watts
  batterySoc: number | null; // Percentage 0-100
  gridPower: number | null; // Watts, positive = import, negative = export
  houseConsumption: number | null; // Watts
  carChargerPower: number | null; // Watts
  timestamp: Date;
}

export interface HistoryDataPoint {
  timestamp: Date;
  value: number;
}

export interface EnergyHistory {
  pvPower: HistoryDataPoint[];
  gridPower: HistoryDataPoint[];
  houseConsumption: HistoryDataPoint[];
}

export interface DashboardData {
  metrics: EnergyMetrics;
  history: EnergyHistory;
}

// Error types

export type HAErrorType =
  | "network"
  | "auth"
  | "not_found"
  | "unavailable"
  | "timeout"
  | "unknown";

export class HAError extends Error {
  constructor(
    public type: HAErrorType,
    message: string
  ) {
    super(message);
    this.name = "HAError";
  }
}
