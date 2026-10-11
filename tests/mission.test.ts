import { describe, expect, it } from "vitest";

import { parseMission, parseMissionJson } from "../src/mission/schema";
import { serializeMission } from "../src/mission/serialize";
import {
  createMissionFromPlannerState,
  createPlannerStateFromMission,
  initialPlannerState,
  makeWaypoint,
} from "../src/mission/transforms";
import { isMissionV1, validateMission } from "../src/mission/validation";

const VALID_MISSION = {
  version: 1,
  items: [
    { type: "takeoff", altitude_m: 10 },
    {
      type: "waypoint",
      lat_deg: -35.3632,
      lon_deg: 149.1652,
      altitude_m: 10,
      hold_s: 0,
      accept_radius_m: 0,
    },
    { type: "rtl" },
  ],
};

function issuesFor(value: unknown): string[] {
  return validateMission(value).map((issue) => issue.message);
}

describe("mission validation — valid documents", () => {
  it("accepts the canonical takeoff → waypoint → rtl mission", () => {
    expect(validateMission(VALID_MISSION)).toEqual([]);
    expect(isMissionV1(VALID_MISSION)).toBe(true);
  });

  it("accepts a takeoff-only mission (rtl-free plans are mavctl-legal)", () => {
    expect(validateMission({ version: 1, items: [{ type: "takeoff", altitude_m: 5 }] })).toEqual([]);
  });

  it("accepts a land terminal with optional abort altitude", () => {
    const mission = {
      version: 1,
      items: [
        { type: "takeoff", altitude_m: 8 },
        { type: "land", lat_deg: -35.3, lon_deg: 149.1, altitude_m: 2 },
      ],
    };
    expect(validateMission(mission)).toEqual([]);
  });
});

describe("mission validation — structural rejection", () => {
  it("rejects non-object documents", () => {
    expect(issuesFor("nope")).toContain("mission must be a JSON object");
    expect(issuesFor(null)).toContain("mission must be a JSON object");
  });

  it("rejects wrong or non-integer schema versions", () => {
    expect(issuesFor({ ...VALID_MISSION, version: 2 })).toContain(
      "unsupported mission schema version; expected exactly 1",
    );
    // JS cannot distinguish the number 1.0 from 1; string and boolean
    // versions are rejected at runtime (mavctl additionally rejects JSON
    // `1.0` at the wire level — the dry-run bridge catches that).
    expect(issuesFor({ ...VALID_MISSION, version: "1" })).toContain(
      "unsupported mission schema version; expected exactly 1",
    );
    expect(issuesFor({ ...VALID_MISSION, version: true })).toContain(
      "unsupported mission schema version; expected exactly 1",
    );
  });

  it("rejects unknown top-level fields (extra=forbid)", () => {
    expect(issuesFor({ ...VALID_MISSION, frame: "GLOBAL" })).toContain(
      'unknown field "frame" (mavctl rejects extra fields)',
    );
  });

  it("rejects empty missions", () => {
    expect(issuesFor({ version: 1, items: [] })).toContain(
      "upload missions must not be empty",
    );
  });

  it("rejects missions beyond the 100-item limit", () => {
    const items: object[] = [{ type: "takeoff", altitude_m: 5 }];
    while (items.length < 101) {
      items.push({ type: "waypoint", lat_deg: 1, lon_deg: 1, altitude_m: 5 });
    }
    expect(issuesFor({ version: 1, items })).toContain(
      "mission exceeds the 100-item limit (101)",
    );
  });
});

describe("mission validation — item rules", () => {
  it("rejects unknown item types", () => {
    const issues = issuesFor({
      version: 1,
      items: [{ type: "takeoff", altitude_m: 5 }, { type: "jump" }],
    });
    expect(issues.some((m) => m.includes("unknown item type"))).toBe(true);
  });

  it("requires the first item to be takeoff", () => {
    const issues = issuesFor({
      version: 1,
      items: [{ type: "waypoint", lat_deg: 1, lon_deg: 1, altitude_m: 5 }],
    });
    expect(issues).toContain(
      "first mission item must be 'takeoff' (ArduCopter-first v1 constraint)",
    );
  });

  it("rejects items after a terminal land/rtl", () => {
    const issues = issuesFor({
      version: 1,
      items: [
        { type: "takeoff", altitude_m: 5 },
        { type: "rtl" },
        { type: "waypoint", lat_deg: 1, lon_deg: 1, altitude_m: 5 },
      ],
    });
    expect(issues).toContain(
      "no items may follow terminal 'land'/'rtl' item at index 1",
    );
  });

  it("rejects out-of-range coordinates and altitudes", () => {
    const issues = issuesFor({
      version: 1,
      items: [
        { type: "takeoff", altitude_m: 0 },
        {
          type: "waypoint",
          lat_deg: 91,
          lon_deg: -181,
          altitude_m: -3,
          hold_s: -1,
          accept_radius_m: -2,
        },
      ],
    });
    expect(issues).toContain("must be <= 90");
    expect(issues).toContain("must be >= -180");
    expect(issues).toContain("must be > 0");
    expect(issues).toContain("must be >= 0");
  });

  it("rejects non-finite numbers", () => {
    const issues = issuesFor({
      version: 1,
      items: [
        { type: "takeoff", altitude_m: 5 },
        { type: "waypoint", lat_deg: Number.NaN, lon_deg: 1, altitude_m: 5 },
      ],
    });
    expect(issues).toContain("must be a finite number");
  });

  it("rejects unknown item fields", () => {
    const issues = issuesFor({
      version: 1,
      items: [
        { type: "takeoff", altitude_m: 5 },
        { type: "waypoint", lat_deg: 1, lon_deg: 1, altitude_m: 5, mav_cmd: 16 },
      ],
    });
    expect(issues.some((m) => m.includes('unknown field "mav_cmd"'))).toBe(true);
  });
});

describe("parse and serialize roundtrip", () => {
  it("parses a valid document and serializes it stably", () => {
    const result = parseMission(VALID_MISSION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = serializeMission(result.mission);
    expect(JSON.parse(serialized)).toEqual(VALID_MISSION);
    expect(serialized).toContain('"version": 1');
  });

  it("roundtrips JSON text through parse → serialize → parse", () => {
    const first = parseMissionJson(JSON.stringify(VALID_MISSION));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = parseMissionJson(serializeMission(first.mission));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.mission).toEqual(first.mission);
  });

  it("reports invalid JSON text without throwing", () => {
    const result = parseMissionJson("{not json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.message).toContain("invalid JSON");
  });

  it("normalizes optional waypoint fields to canonical zeros", () => {
    const result = parseMission({
      version: 1,
      items: [
        { type: "takeoff", altitude_m: 5 },
        { type: "waypoint", lat_deg: 1, lon_deg: 2, altitude_m: 5 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = serializeMission(result.mission);
    expect(serialized).toContain('"hold_s": 0');
    expect(serialized).toContain('"accept_radius_m": 0');
  });
});

describe("planner transforms", () => {
  it("materializes takeoff and rtl on the first waypoint", () => {
    let state = initialPlannerState();
    state = {
      ...state,
      waypoints: [...state.waypoints, makeWaypoint(state, -35.36, 149.16)],
    };
    const mission = createMissionFromPlannerState(state);
    expect(mission.items.map((item) => item.type)).toEqual([
      "takeoff",
      "waypoint",
      "rtl",
    ]);
    const takeoff = mission.items[0];
    if (takeoff?.type !== "takeoff") throw new Error("expected takeoff");
    expect(takeoff.altitude_m).toBe(state.globalAltitudeM);
  });

  it("roundtrips planner state through a mission document", () => {
    let state = initialPlannerState();
    state = {
      ...state,
      globalAltitudeM: 12,
      waypoints: [
        makeWaypoint(state, -35.36, 149.16),
        { ...makeWaypoint(state, -35.37, 149.17), holdS: 3, acceptRadiusM: 2 },
      ],
    };
    const mission = createMissionFromPlannerState(state);
    const restored = createPlannerStateFromMission(mission, state.home);
    expect(restored.globalAltitudeM).toBe(12);
    // Waypoint ids are regenerated on import; compare planning payloads.
    expect(
      restored.waypoints.map(({ id: _id, ...rest }) => rest),
    ).toEqual(state.waypoints.map(({ id: _id, ...rest }) => rest));
  });

  it("imports a downloaded-shaped mission and preserves coordinates", () => {
    const state = createPlannerStateFromMission(
      {
        version: 1,
        items: [
          { type: "takeoff", altitude_m: 7 },
          { type: "waypoint", lat_deg: -35.3, lon_deg: 149.1, altitude_m: 7 },
          { type: "land", lat_deg: -35.31, lon_deg: 149.11, altitude_m: 2 },
        ],
      },
      initialPlannerState().home,
    );
    expect(state.globalAltitudeM).toBe(7);
    expect(state.waypoints).toHaveLength(2);
    // v0 keeps the landing position as an editable final waypoint.
    expect(state.waypoints[1]?.latDeg).toBe(-35.31);
  });
});
