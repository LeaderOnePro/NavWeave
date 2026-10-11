/**
 * Exit-code → DryRunResult mapping for the local mavctl bridge, mirroring
 * mavctl's exit-code contract (see docs/MAVCTL_CONTRACT.md).
 */
import type { DryRunCheck, DryRunResult } from "./types";

interface MavctlErrorShape {
  code?: number;
  message?: string;
  detail?: {
    reason?: string;
    hint?: string;
    checks?: DryRunCheck[];
  };
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function parseChecks(value: unknown): DryRunCheck[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is DryRunCheck =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as DryRunCheck).name === "string",
  );
}

/**
 * Map a mavctl invocation outcome to a normalized DryRunResult. stdout
 * carries success payloads; stderr carries the structured error object.
 */
export function mapMavctlOutcome(
  exitCode: number,
  stdout: string,
  stderr: string,
  context: string,
): DryRunResult {
  const stdoutValue = parseJson(stdout);
  if (exitCode === 0 && stdoutValue !== null && typeof stdoutValue === "object") {
    return {
      ok: true,
      exit_code: 0,
      reason: null,
      message: `${context}: mavctl exited 0 (nothing was sent)`,
      hint: null,
      checks: [],
    };
  }

  const stderrValue = parseJson(stderr);
  const error =
    stderrValue !== null && typeof stderrValue === "object"
      ? ((stderrValue as { error?: MavctlErrorShape }).error ?? null)
      : null;
  if (error !== null) {
    return {
      ok: false,
      exit_code: error.code ?? exitCode,
      reason: error.detail?.reason ?? `mavctl_exit_${exitCode}`,
      message: error.message ?? `mavctl failed with exit code ${exitCode}`,
      hint: error.detail?.hint ?? null,
      checks: parseChecks(error.detail?.checks),
    };
  }

  return {
    ok: false,
    exit_code: exitCode,
    reason: `mavctl_exit_${exitCode}`,
    message:
      stderr.trim() !== ""
        ? `${context}: ${stderr.trim().slice(0, 200)}`
        : `${context}: mavctl exited with code ${exitCode} and produced no structured error`,
    hint: null,
    checks: [],
  };
}
