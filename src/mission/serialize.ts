/**
 * Stable serialization: canonical key order per item, two-space indented
 * JSON — the exact document shape mavctl consumes. Callers must run
 * `validateMission` (or `parseMission`) first; this module performs no
 * validation itself.
 */
import type { MissionItem, MissionV1 } from "./types";

function canonicalItem(item: MissionItem): Record<string, unknown> {
  switch (item.type) {
    case "takeoff":
      return { type: "takeoff", altitude_m: item.altitude_m };
    case "waypoint":
      return {
        type: "waypoint",
        lat_deg: item.lat_deg,
        lon_deg: item.lon_deg,
        altitude_m: item.altitude_m,
        hold_s: item.hold_s,
        accept_radius_m: item.accept_radius_m,
      };
    case "land":
      return {
        type: "land",
        lat_deg: item.lat_deg,
        lon_deg: item.lon_deg,
        altitude_m: item.altitude_m,
        abort_alt_m: item.abort_alt_m,
      };
    case "rtl":
      return { type: "rtl" };
  }
}

export interface SerializeOptions {
  /** Pretty-print with 2-space indent (default true, matches mavctl docs). */
  readonly pretty?: boolean;
}

export function serializeMission(
  mission: MissionV1,
  options: SerializeOptions = {},
): string {
  const document = {
    version: mission.version,
    items: mission.items.map(canonicalItem),
  };
  return JSON.stringify(document, null, options.pretty === false ? undefined : 2);
}
