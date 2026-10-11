import { describe, expect, it, vi } from "vitest";

import {
  assertAllowedMavctlArgs,
  buildDryRunUploadArgs,
  buildStatusArgs,
} from "../src/bridge/argv";
import { mapMavctlOutcome } from "../src/bridge/dryRun";
import { MockMavctlClient } from "../src/bridge/MockMavctlClient";
import { LocalMavctlClient, type SpawnFunction } from "../src/bridge/LocalMavctlClient";
import type { MissionV1 } from "../src/mission/types";
import {
  createMissionFromPlannerState,
  initialPlannerState,
  makeWaypoint,
} from "../src/mission/transforms";

function validMission(): MissionV1 {
  let state = initialPlannerState();
  state = {
    ...state,
    waypoints: [makeWaypoint(state, -35.3632, 149.1652)],
  };
  return createMissionFromPlannerState(state);
}

// -- argv invariant -----------------------------------------------------------

describe("mavctl argv invariant", () => {
  it("builds the exact allowed argv shapes", () => {
    expect(buildStatusArgs()).toEqual(["status", "--json"]);
    expect(buildDryRunUploadArgs("/tmp/m.json")).toEqual([
      "mission",
      "upload",
      "/tmp/m.json",
      "--confirm",
      "--dry-run",
      "--json",
    ]);
  });

  it("throws on forbidden flight verbs", () => {
    for (const verb of ["arm", "disarm", "takeoff", "land", "rtl", "mode", "clear", "start"]) {
      expect(() => assertAllowedMavctlArgs(["mavctl", verb])).toThrow(/may not invoke/);
    }
  });

  it("throws on a mission upload without --dry-run", () => {
    expect(() =>
      assertAllowedMavctlArgs(["mavctl", "mission", "upload", "m.json", "--confirm", "--json"]),
    ).toThrow(/without --dry-run/);
  });

  it("throws on a mission upload without --confirm", () => {
    expect(() =>
      assertAllowedMavctlArgs(["mavctl", "mission", "upload", "m.json", "--dry-run", "--json"]),
    ).toThrow(/without --confirm/);
  });
});

// -- mock client ----------------------------------------------------------------

describe("MockMavctlClient", () => {
  it("passes a valid mission in the default scenario with guard checks", async () => {
    const client = new MockMavctlClient("pass");
    const result = await client.validateMissionDryRun(validMission());
    expect(result.ok).toBe(true);
    expect(result.exit_code).toBe(0);
    expect(result.checks.map((check) => check.name)).toEqual([
      "confirm",
      "connected",
      "ground_state",
    ]);
  });

  it("returns mavctl-style rejections per scenario", async () => {
    for (const [scenario, reason, exit] of [
      ["mission_requires_disarmed", "mission_requires_disarmed", 5],
      ["ground_state_stale", "ground_state_stale", 5],
      ["not_connected", "not_connected", 4],
    ] as const) {
      const client = new MockMavctlClient(scenario);
      const result = await client.validateMissionDryRun(validMission());
      expect(result.ok).toBe(false);
      expect(result.reason).toBe(reason);
      expect(result.exit_code).toBe(exit);
      expect(result.hint).toBeTruthy();
    }
  });

  it("rejects invalid missions locally before any scenario", async () => {
    const client = new MockMavctlClient("pass");
    const result = await client.validateMissionDryRun({
      version: 1,
      items: [{ type: "waypoint", lat_deg: 1, lon_deg: 1, altitude_m: 5 }],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_mission");
    expect(result.message).toContain("first mission item must be 'takeoff'");
  });

  it("provides mock status honoring toggles", async () => {
    const connected = new MockMavctlClient("pass");
    expect((await connected.getStatus()).connected).toBe(true);
    const disconnected = new MockMavctlClient("not_connected");
    expect((await disconnected.getStatus()).connected).toBe(false);
  });
});

// -- local client (spawn mocked; never a real mavctl call) ----------------------

function spawnOutcome(overrides: Partial<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  spawnError: Error | null;
}>): SpawnFunction {
  return vi.fn().mockResolvedValue({
    exitCode: 0,
    stdout: "",
    stderr: "",
    spawnError: null,
    ...overrides,
  });
}

describe("LocalMavctlClient", () => {
  it("constructs dry-run argv and parses a success stdout", async () => {
    const spawn = spawnOutcome({ exitCode: 0, stdout: '{"ok": true}' });
    const client = new LocalMavctlClient({ binary: "mavctl", spawnImpl: spawn });
    const result = await client.validateMissionDryRun(validMission());

    expect(result.ok).toBe(true);
    const call = (spawn as ReturnType<typeof vi.fn>).mock.calls[0];
    if (call === undefined) {
      throw new Error("spawn was not called");
    }
    const [_binary, args] = call as [string, string[]];
    expect(args).toEqual([
      "mission",
      "upload",
      expect.stringMatching(/navweave-dryrun-.*\.json$/),
      "--confirm",
      "--dry-run",
      "--json",
    ]);
  });

  it("parses a structured stderr guard rejection (exit 5)", async () => {
    const spawn = spawnOutcome({
      exitCode: 5,
      stderr: JSON.stringify({
        error: {
          code: 5,
          message: "refusing to mission_upload: the vehicle is armed",
          detail: {
            reason: "mission_requires_disarmed",
            hint: "disarm first",
            checks: [{ name: "armed", passed: false, detail: "armed=true" }],
          },
        },
      }),
    });
    const client = new LocalMavctlClient({ spawnImpl: spawn });
    const result = await client.validateMissionDryRun(validMission());

    expect(result.ok).toBe(false);
    expect(result.exit_code).toBe(5);
    expect(result.reason).toBe("mission_requires_disarmed");
    expect(result.hint).toBe("disarm first");
    expect(result.checks).toHaveLength(1);
  });

  it("maps a missing binary to mavctl_unavailable", async () => {
    const spawn = spawnOutcome({
      spawnError: Object.assign(new Error("spawn mavctl ENOENT"), { code: "ENOENT" }),
    });
    const client = new LocalMavctlClient({ spawnImpl: spawn });
    const result = await client.validateMissionDryRun(validMission());

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("mavctl_unavailable");
    expect(result.hint).toBe("install mavctl or switch to Mock Mode");
  });

  it("deletes the temporary mission file after the run", async () => {
    const fs = await import("node:fs/promises");
    let capturedFile: string | null = null;
    const spawn: SpawnFunction = vi.fn(async (_binary, args) => {
      capturedFile = args[2] ?? null;
      return { exitCode: 0, stdout: "{}", stderr: "", spawnError: null };
    });
    const client = new LocalMavctlClient({ spawnImpl: spawn });
    await client.validateMissionDryRun(validMission());

    if (capturedFile === null) {
      throw new Error("spawn never received a mission file path");
    }
    await expect(fs.stat(capturedFile)).rejects.toThrow();
  });

  it("keeps read-only status on the allowed surface", async () => {
    const spawn = spawnOutcome({
      exitCode: 0,
      stdout: JSON.stringify({ connected: true, armed: false, flight_mode: "GUIDED" }),
    });
    const client = new LocalMavctlClient({ spawnImpl: spawn });
    const status = await client.getStatus();

    expect(status.connected).toBe(true);
    expect(status.flight_mode).toBe("GUIDED");
    const call = (spawn as ReturnType<typeof vi.fn>).mock.calls[0];
    if (call === undefined) {
      throw new Error("spawn was not called");
    }
    expect(call[1]).toEqual(["status", "--json"]);
  });
});

// -- outcome mapping --------------------------------------------------------------

describe("mapMavctlOutcome", () => {
  it("maps structured stderr errors to reason/hint", () => {
    const result = mapMavctlOutcome(
      5,
      "",
      JSON.stringify({
        error: {
          code: 5,
          message: "refusing",
          detail: { reason: "ground_state_stale", hint: "wait" },
        },
      }),
      "dry-run",
    );
    expect(result).toMatchObject({
      ok: false,
      exit_code: 5,
      reason: "ground_state_stale",
      hint: "wait",
    });
  });

  it("falls back to raw stderr when no structured error exists", () => {
    const result = mapMavctlOutcome(1, "", "boom", "dry-run");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("mavctl_exit_1");
    expect(result.message).toContain("boom");
  });
});
