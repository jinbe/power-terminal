import { getConfig } from "../config";

/**
 * Format power value as W or kW with appropriate precision
 * >= 1000W: shows as kW with 1 decimal (e.g., 3.2kW)
 * < 1000W: shows as whole watts (e.g., 850W)
 */
export function formatPower(watts: number | null): string {
  if (watts === null) return "—";

  const absWatts = Math.abs(watts);
  const sign = watts < 0 ? "-" : "";

  if (absWatts >= 1000) {
    return `${sign}${(absWatts / 1000).toFixed(1)}kW`;
  }

  return `${sign}${Math.round(absWatts)}W`;
}

/**
 * Format percentage value
 */
export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value)}%`;
}

/**
 * Format time in configured timezone
 */
export function formatTime(date: Date): string {
  const config = getConfig();
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: config.timezone,
  });
}

/**
 * Format date in configured timezone
 */
export function formatDate(date: Date): string {
  const config = getConfig();
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: config.timezone,
  });
}

/**
 * Format short time for graph axis (e.g., "2PM")
 */
export function formatShortTime(date: Date): string {
  const config = getConfig();
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    timeZone: config.timezone,
  });
}
