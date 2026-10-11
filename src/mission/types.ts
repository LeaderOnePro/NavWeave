/**
 * Mission JSON v1 document types, mirroring mavctl's
 * `src/mavctl/models/mission.py` (the schema authority).
 *
 * NavWeave does not encode MAVLink wire frames. It only produces and
 * validates the JSON document mavctl consumes. Unknown fields are rejected
 * by mavctl (`extra="forbid"`), so the types below are closed: the parser
 * treats any additional key as an issue.
 */

export const MISSION_SCHEMA_VERSION = 1 as const;
export const MISSION_MAX_ITEMS = 100;

export type MissionItemType = "takeoff" | "waypoint" | "land" | "rtl";

/** Vertical takeoff to a relative altitude (m, > 0). */
export interface TakeoffItem {
  type: "takeoff";
  altitude_m: number;
}

/** Navigate to a position. `hold_s` / `accept_radius_m` default to 0. */
export interface WaypointItem {
  type: "waypoint";
  lat_deg: number;
  lon_deg: number;
  altitude_m: number;
  hold_s?: number;
  accept_radius_m?: number;
}

/** Land at a position. `abort_alt_m` (m, >= 0) defaults to 0. */
export interface LandItem {
  type: "land";
  lat_deg: number;
  lon_deg: number;
  altitude_m: number;
  abort_alt_m?: number;
}

/** Return to launch. The vehicle ignores any location on RTL items. */
export interface RtlItem {
  type: "rtl";
}

export type MissionItem = TakeoffItem | WaypointItem | LandItem | RtlItem;

export interface MissionV1 {
  version: typeof MISSION_SCHEMA_VERSION;
  items: MissionItem[];
}

/** A validated issue, mirroring mavctl's reason/hint style. */
export interface MissionIssue {
  path: string;
  message: string;
}

/** Parse outcome: never throws — callers branch on `ok`. */
export type MissionParseResult =
  | { ok: true; mission: MissionV1 }
  | { ok: false; issues: MissionIssue[] };
