/**
 * Parsing of unknown JSON into a MissionV1 document. Never throws:
 * `parseMission` returns a discriminated result so callers (import UI,
 * bridge) can show issues directly.
 */
import { normalizeMission } from "./validation";
import type { MissionParseResult } from "./types";

/**
 * Parse and validate an unknown value (e.g. a JSON.parse result or an
 * imported file) as Mission JSON v1. Returns every validation issue on
 * failure — the same rules mavctl enforces.
 */
export function parseMission(value: unknown): MissionParseResult {
  const { issues, mission } = normalizeMission(value);
  if (issues.length > 0 || mission === null) {
    return { ok: false, issues };
  }
  return { ok: true, mission };
}

/** Convenience wrapper for JSON text (import flow). */
export function parseMissionJson(text: string): MissionParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: "$",
          message: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
  return parseMission(value);
}
