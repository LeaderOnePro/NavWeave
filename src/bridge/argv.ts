/**
 * The v0 mavctl bridge surface: argv builders plus a hard dry-run
 * invariant check. The ONLY commands NavWeave may assemble are:
 *
 *   mavctl status --json
 *   mavctl telemetry --json
 *   mavctl mission upload <file> --confirm --dry-run --json
 *
 * Everything else throws at construction time — there is no code path that
 * can assemble a non-dry-run upload or a flight command.
 */

/** Verbs mavctl treats as state-changing; never constructable by NavWeave. */
const FORBIDDEN_VERBS = new Set([
  "arm",
  "disarm",
  "takeoff",
  "land",
  "rtl",
  "mode",
  "clear",
  "start",
  "set-current",
]);

export function buildStatusArgs(): string[] {
  const args = ["status", "--json"];
  assertAllowedMavctlArgs(args);
  return args;
}

export function buildTelemetryArgs(): string[] {
  const args = ["telemetry", "--json"];
  assertAllowedMavctlArgs(args);
  return args;
}

export function buildDryRunUploadArgs(missionFile: string): string[] {
  const args = [
    "mission",
    "upload",
    missionFile,
    "--confirm",
    "--dry-run",
    "--json",
  ];
  assertAllowedMavctlArgs(args);
  return args;
}

/**
 * Hard dry-run invariant: reject any argv that (a) contains a forbidden
 * mavctl verb, or (b) performs a `mission upload` without BOTH --confirm
 * and --dry-run. Throws — callers must never proceed.
 */
export function assertAllowedMavctlArgs(args: readonly string[]): void {
  if (args.length === 0) {
    throw new Error("mavctl argv is empty");
  }
  const tokens = args.map((token) => token.toLowerCase());
  for (const token of tokens) {
    if (FORBIDDEN_VERBS.has(token)) {
      throw new Error(
        `NavWeave may not invoke the mavctl verb "${token}" — execution belongs to mavctl`,
      );
    }
  }
  const uploadIndex = tokens.indexOf("upload");
  if (uploadIndex !== -1) {
    if (tokens[uploadIndex - 1] !== "mission") {
      throw new Error('unexpected "upload" outside a mission command');
    }
    if (!tokens.includes("--dry-run")) {
      throw new Error("mission upload without --dry-run is forbidden in NavWeave v0");
    }
    if (!tokens.includes("--confirm")) {
      throw new Error("mission upload without --confirm is rejected by mavctl");
    }
  }
}
