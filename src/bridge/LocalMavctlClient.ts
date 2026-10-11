/**
 * Opt-in local mavctl bridge. The ONLY bridge allowed to spawn the mavctl
 * binary, and only for the allow-listed dry-run/status/telemetry commands.
 *
 * - argv arrays only (never a shell string) — see argv.ts;
 * - the mission is written to a restrictive temp file, deleted in `finally`;
 * - the daemon/SITL is never started by NavWeave;
 * - a missing binary surfaces reason = "mavctl_unavailable".
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { serializeMission } from "../mission/serialize";
import type { MissionV1 } from "../mission/types";
import type { Telemetry, VehicleStatus } from "../vehicle/types";
import { mapMavctlOutcome } from "./dryRun";
import {
  buildDryRunUploadArgs,
  buildStatusArgs,
  buildTelemetryArgs,
} from "./argv";
import type { DryRunResult, MavctlClient } from "./types";

export interface SpawnOutcome {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  /** ENOENT-style failure to even start the binary. */
  spawnError: NodeJS.ErrnoException | null;
}

/**
 * Injectable spawn seam: tests substitute this instead of stubbing the
 * child_process module. The default implementation wraps node's spawn.
 */
export type SpawnFunction = (
  binary: string,
  args: string[],
  timeoutMs: number,
) => Promise<SpawnOutcome>;

export function defaultSpawn(
  binary: string,
  args: string[],
  timeoutMs: number,
): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, { shell: false });
    let stdout = "";
    let stderr = "";
    let spawnError: NodeJS.ErrnoException | null = null;
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      spawnError = error;
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stdout, stderr, spawnError });
    });
  });
}

export interface LocalMavctlClientOptions {
  /** mavctl binary path/name. Default "mavctl" from PATH. */
  readonly binary?: string;
  /** Per-invocation timeout in ms (SIGKILL afterwards). Default 30 s. */
  readonly timeoutMs?: number;
  /** Test seam. */
  readonly spawnImpl?: SpawnFunction;
}

interface MavctlInvocation {
  outcome: SpawnOutcome;
  argv: string[];
}

export class LocalMavctlClient implements MavctlClient {
  readonly mode = "local" as const;

  private readonly binary: string;
  private readonly timeoutMs: number;
  private readonly spawnImpl: SpawnFunction;

  constructor(options: LocalMavctlClientOptions = {}) {
    this.binary = options.binary ?? "mavctl";
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.spawnImpl = options.spawnImpl ?? defaultSpawn;
  }

  async run(binary: string, args: string[]): Promise<MavctlInvocation> {
    const outcome = await this.spawnImpl(binary, args, this.timeoutMs);
    return { outcome, argv: [binary, ...args] };
  }

  async getStatus(): Promise<VehicleStatus> {
    const args = buildStatusArgs();
    const { outcome } = await this.run(this.binary, args);
    if (outcome.spawnError !== null) {
      throw new Error(this.unavailableMessage(outcome.spawnError));
    }
    const parsed = JSON.parse(outcome.stdout) as Partial<VehicleStatus>;
    return {
      connected: parsed.connected ?? false,
      armed: parsed.armed ?? null,
      flight_mode: parsed.flight_mode ?? null,
      gps: parsed.gps ?? null,
      home_position: parsed.home_position ?? null,
      position: parsed.position ?? null,
      health:
        parsed.health ?? {
          estimator: { status: "unknown", age_s: null },
        },
    };
  }

  async getTelemetry(): Promise<Telemetry> {
    const args = buildTelemetryArgs();
    const { outcome } = await this.run(this.binary, args);
    if (outcome.spawnError !== null) {
      throw new Error(this.unavailableMessage(outcome.spawnError));
    }
    const parsed = JSON.parse(outcome.stdout) as Partial<Telemetry>;
    return { position: parsed.position ?? null };
  }

  /**
   * Dry-run validation: writes the mission to a temp file (0600), runs
   * `mavctl mission upload <file> --confirm --dry-run --json`, deletes the
   * file in `finally`, and maps the outcome. Never performs a real upload.
   */
  async validateMissionDryRun(mission: MissionV1): Promise<DryRunResult> {
    const context = "mission upload dry-run";
    let tempDir: string | null = null;
    let missionFile: string | null = null;
    try {
      tempDir = await mkdtemp(path.join(tmpdir(), "navweave-dryrun-"));
      missionFile = path.join(tempDir, `mission-${randomUUID()}.json`);
      await writeFile(missionFile, serializeMission(mission), { mode: 0o600 });

      const args = buildDryRunUploadArgs(missionFile);
      const { outcome } = await this.run(this.binary, args);
      if (outcome.spawnError !== null) {
        const error = outcome.spawnError;
        if (error.code === "ENOENT") {
          return {
            ok: false,
            exit_code: -1,
            reason: "mavctl_unavailable",
            message: `could not run mavctl (${error.message})`,
            hint: "install mavctl or switch to Mock Mode",
            checks: [],
          };
        }
        return {
          ok: false,
          exit_code: -1,
          reason: "mavctl_spawn_failed",
          message: `could not run mavctl: ${error.message}`,
          hint: null,
          checks: [],
        };
      }
      return mapMavctlOutcome(
        outcome.exitCode ?? -1,
        outcome.stdout,
        outcome.stderr,
        context,
      );
    } finally {
      if (tempDir !== null) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  }

  private unavailableMessage(error: NodeJS.ErrnoException): string {
    return `could not run mavctl (${error.message})`;
  }
}
