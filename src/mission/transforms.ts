/**
 * Transforms between the interactive planner state and Mission JSON v1.
 *
 * The v0 planner always produces `takeoff → waypoints… → rtl`: the first
 * waypoint a user adds materializes the takeoff and the terminal rtl, and
 * new waypoints are inserted before the rtl. The planner never produces
 * `land` in v0 (imported `land` items are preserved by the mission, see
 * below).
 */
import type { MissionV1, WaypointItem } from "./types";

export interface PlannerHome {
  latDeg: number;
  lonDeg: number;
}

export interface PlannerWaypoint {
  /** Stable UI identity (nanoid-style); never serialized into the mission. */
  readonly id: string;
  latDeg: number;
  lonDeg: number;
  altitudeM: number;
  holdS: number;
  acceptRadiusM: number;
}

export interface PlannerState {
  home: PlannerHome;
  /** Vehicle marker (mock); distinct from home. */
  vehiclePosition: PlannerHome;
  globalAltitudeM: number;
  waypoints: PlannerWaypoint[];
}

let counter = 0;

export function makeWaypointId(): string {
  counter += 1;
  return `wp-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a waypoint at a position using the planner's global altitude. */
export function makeWaypoint(
  state: PlannerState,
  latDeg: number,
  lonDeg: number,
): PlannerWaypoint {
  return {
    id: makeWaypointId(),
    latDeg,
    lonDeg,
    altitudeM: state.globalAltitudeM,
    holdS: 0,
    acceptRadiusM: 0,
  };
}

/**
 * Build the Mission JSON v1 document from planner state:
 * `takeoff (globalAltitudeM) → waypoints → rtl`.
 */
export function createMissionFromPlannerState(
  state: PlannerState,
): MissionV1 {
  const waypointItems: WaypointItem[] = state.waypoints.map((wp) => ({
    type: "waypoint",
    lat_deg: wp.latDeg,
    lon_deg: wp.lonDeg,
    altitude_m: wp.altitudeM,
    hold_s: wp.holdS,
    accept_radius_m: wp.acceptRadiusM,
  }));
  return {
    version: 1,
    items: [
      { type: "takeoff", altitude_m: state.globalAltitudeM },
      ...waypointItems,
      { type: "rtl" },
    ],
  };
}

/**
 * Seed planner state from an imported mission: the takeoff altitude becomes
 * the global altitude, `waypoint` items become editable waypoints, and a
 * trailing `rtl` (or `land`) is preserved conceptually — the v0 planner
 * always appends its own rtl on export, so imported `land` terminals are
 * TODO-tracked and currently mapped to a final waypoint at the land
 * position. This keeps the editor lossy-but-honest for v0 (recorded in
 * docs/ROADMAP.md).
 */
export function createPlannerStateFromMission(
  mission: MissionV1,
  vehiclePosition: PlannerHome,
): PlannerState {
  const takeoff = mission.items.find((item) => item.type === "takeoff");
  const globalAltitudeM =
    takeoff !== undefined && takeoff.type === "takeoff"
      ? takeoff.altitude_m
      : 10;

  const waypoints: PlannerWaypoint[] = [];
  for (const item of mission.items) {
    if (item.type === "waypoint") {
      waypoints.push({
        id: makeWaypointId(),
        latDeg: item.lat_deg,
        lonDeg: item.lon_deg,
        altitudeM: item.altitude_m,
        holdS: item.hold_s ?? 0,
        acceptRadiusM: item.accept_radius_m ?? 0,
      });
    } else if (item.type === "land") {
      // v0 editor has no land marker yet: keep the landing position as a
      // final waypoint so coordinates are never silently dropped.
      // TODO(roadmap v0.x): first-class land marker editing.
      waypoints.push({
        id: makeWaypointId(),
        latDeg: item.lat_deg,
        lonDeg: item.lon_deg,
        altitudeM: item.altitude_m,
        holdS: 0,
        acceptRadiusM: 0,
      });
    }
  }

  return {
    home: vehiclePosition,
    vehiclePosition,
    globalAltitudeM,
    waypoints,
  };
}

/** Initial mock-planner state (Canberra SITL-ish area, no waypoints). */
export function initialPlannerState(): PlannerState {
  const home: PlannerHome = { latDeg: -35.363262, lonDeg: 149.165237 };
  return {
    home,
    vehiclePosition: { latDeg: home.latDeg, lonDeg: home.lonDeg },
    globalAltitudeM: 10,
    waypoints: [],
  };
}
