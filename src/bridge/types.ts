/**
 * mavctl bridge contracts. The bridge is the ONLY layer allowed to invoke
 * the mavctl binary, and in v0 the only invocation is
 * `mission upload <file> --confirm --dry-run --json` plus the read-only
 * `status --json` / `telemetry --json`. See docs/MAVCTL_CONTRACT.md.
 */
import type { MissionV1 } from "../mission/types";
import type { Telemetry, VehicleStatus } from "../vehicle/types";

export type BridgeMode = "mock" | "local";

/** One mavctl guard check line (`detail.checks` entries). */
export interface DryRunCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/** Normalized dry-run outcome across mock and local bridges. */
export interface DryRunResult {
  /** true = guards passed and mavctl WOULD execute the upload (nothing was sent). */
  ok: boolean;
  exit_code: number;
  /** mavctl `reason` token (e.g. mission_requires_disarmed) — null on success. */
  reason: string | null;
  message: string;
  hint: string | null;
  checks: DryRunCheck[];
}

export interface MavctlClient {
  readonly mode: BridgeMode;
  getStatus(): Promise<VehicleStatus>;
  getTelemetry(): Promise<Telemetry>;
  validateMissionDryRun(mission: MissionV1): Promise<DryRunResult>;
}

/** Mock scenarios the development panel can cycle through. */
export type MockScenario =
  | "pass"
  | "mission_requires_disarmed"
  | "ground_state_stale"
  | "not_connected"
  | "invalid_mission";
