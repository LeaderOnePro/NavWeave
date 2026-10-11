/** Deterministic mock mavctl client — the default bridge. Never spawns a
 * process; produces mavctl-shaped results for UI development and tests. */
import { validateMission } from "../mission/validation";
import type { MissionV1 } from "../mission/types";
import {
  createMockVehicleStatus,
  DEFAULT_MOCK_TOGGLES,
  type MockVehicleToggles,
} from "../vehicle/mockVehicle";
import type { Telemetry, VehicleStatus } from "../vehicle/types";
import type { DryRunResult, MavctlClient, MockScenario } from "./types";

const SCENARIO_OUTCOMES: Record<
  MockScenario,
  { ok: boolean; exit_code: number; reason: string | null; message: string; hint: string | null }
> = {
  pass: {
    ok: true,
    exit_code: 0,
    reason: null,
    message: "dry-run passed: guards would accept this upload (nothing was sent)",
    hint: null,
  },
  mission_requires_disarmed: {
    ok: false,
    exit_code: 5,
    reason: "mission_requires_disarmed",
    message: "refusing to mission_upload: the vehicle is armed",
    hint: "disarm the vehicle first, then retry the dry-run",
  },
  ground_state_stale: {
    ok: false,
    exit_code: 5,
    reason: "ground_state_stale",
    message:
      "refusing to mission_upload: apparent ground evidence is too stale to gate on",
    hint: "wait for fresh ground state, then retry",
  },
  not_connected: {
    ok: false,
    exit_code: 4,
    reason: "not_connected",
    message: "vehicle not connected (no recent heartbeat)",
    hint: "start mavctl against a vehicle/SITL endpoint or stay in Mock Mode",
  },
  invalid_mission: {
    ok: false,
    exit_code: 2,
    reason: "invalid_mission",
    message: "mission JSON rejected by schema validation",
    hint: "fix the validation issues listed in the preview panel",
  },
};

export class MockMavctlClient implements MavctlClient {
  readonly mode = "mock" as const;

  constructor(
    private readonly scenario: MockScenario = "pass",
    private readonly toggles: MockVehicleToggles = DEFAULT_MOCK_TOGGLES,
  ) {}

  getStatus(): Promise<VehicleStatus> {
    return Promise.resolve(this.getStatusSync());
  }

  /** Synchronous status for React render paths (useMemo). */
  getStatusSync(): VehicleStatus {
    return createMockVehicleStatus(this.togglesForScenario());
  }

  getTelemetry(): Promise<Telemetry> {
    const status = this.getStatus();
    return status.then((value) => ({ position: value.position }));
  }

  validateMissionDryRun(mission: MissionV1): Promise<DryRunResult> {
    // Invalid missions fail locally before any scenario applies — mavctl
    // would reject them at the schema layer too.
    const issues = validateMission(mission);
    if (issues.length > 0 || this.scenario === "invalid_mission") {
      const first = issues[0];
      return Promise.resolve({
        ...SCENARIO_OUTCOMES["invalid_mission"],
        message:
          first === undefined
            ? SCENARIO_OUTCOMES["invalid_mission"].message
            : `mission JSON rejected: ${first.path} ${first.message}`,
        checks: [],
      });
    }
    const outcome = SCENARIO_OUTCOMES[this.scenario];
    const connected = this.toggles.connected;
    return Promise.resolve({
      ...outcome,
      // A disconnected mock never passes, regardless of scenario.
      ok: outcome.ok && connected,
      exit_code: outcome.ok && !connected ? 4 : outcome.exit_code,
      reason: outcome.ok && !connected ? "not_connected" : outcome.reason,
      checks: [
        { name: "confirm", passed: true, detail: "confirmed" },
        {
          name: "connected",
          passed: connected,
          detail: connected ? "heartbeat 0.2s ago" : "no heartbeat (mock)",
        },
        {
          name: "ground_state",
          passed: connected && this.toggles.gpsReady,
          detail:
            connected && this.toggles.gpsReady
              ? "vehicle grounded and disarmed"
              : "ground state unavailable (mock)",
        },
      ],
    });
  }

  private togglesForScenario(): MockVehicleToggles {
    return this.scenario === "not_connected"
      ? { ...this.toggles, connected: false }
      : this.toggles;
  }
}
