/**
 * Structural validation for Mission JSON v1, mirroring mavctl's
 * `MissionV1` pydantic model (extra="forbid", strict version, numeric
 * ranges, takeoff-first, terminal-terminated). NavWeave validation is a UX
 * pre-check only — mavctl re-validates everything it is handed.
 */
import {
  MISSION_MAX_ITEMS,
  type LandItem,
  type MissionIssue,
  type MissionItem,
  type MissionV1,
  type RtlItem,
  type TakeoffItem,
  type WaypointItem,
} from "./types";

const ITEM_TYPES = new Set(["takeoff", "waypoint", "land", "rtl"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStrictInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function extraKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: MissionIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      issues.push({
        path: `${path}.${key}`,
        message: `unknown field "${key}" (mavctl rejects extra fields)`,
      });
    }
  }
}

function checkFiniteRange(
  value: unknown,
  path: string,
  issues: MissionIssue[],
  options: { min?: number; max?: number; exclusiveMin?: number },
): void {
  if (!isFiniteNumber(value)) {
    issues.push({ path, message: "must be a finite number" });
    return;
  }
  if (options.exclusiveMin !== undefined && value <= options.exclusiveMin) {
    issues.push({
      path,
      message: `must be > ${options.exclusiveMin}`,
    });
  }
  if (options.min !== undefined && value < options.min) {
    issues.push({ path, message: `must be >= ${options.min}` });
  }
  if (options.max !== undefined && value > options.max) {
    issues.push({ path, message: `must be <= ${options.max}` });
  }
}

function checkTakeoff(
  value: Record<string, unknown>,
  path: string,
  issues: MissionIssue[],
): TakeoffItem | null {
  extraKeys(value, ["type", "altitude_m"], path, issues);
  checkFiniteRange(value["altitude_m"], `${path}.altitude_m`, issues, {
    exclusiveMin: 0,
  });
  return isFiniteNumber(value["altitude_m"])
    ? { type: "takeoff", altitude_m: value["altitude_m"] }
    : null;
}

function checkWaypoint(
  value: Record<string, unknown>,
  path: string,
  issues: MissionIssue[],
): WaypointItem | null {
  extraKeys(
    value,
    ["type", "lat_deg", "lon_deg", "altitude_m", "hold_s", "accept_radius_m"],
    path,
    issues,
  );
  checkFiniteRange(value["lat_deg"], `${path}.lat_deg`, issues, {
    min: -90,
    max: 90,
  });
  checkFiniteRange(value["lon_deg"], `${path}.lon_deg`, issues, {
    min: -180,
    max: 180,
  });
  checkFiniteRange(value["altitude_m"], `${path}.altitude_m`, issues, {
    exclusiveMin: 0,
  });
  if (value["hold_s"] !== undefined) {
    checkFiniteRange(value["hold_s"], `${path}.hold_s`, issues, { min: 0 });
  }
  if (value["accept_radius_m"] !== undefined) {
    checkFiniteRange(
      value["accept_radius_m"],
      `${path}.accept_radius_m`,
      issues,
      { min: 0 },
    );
  }
  const { lat_deg, lon_deg, altitude_m } = value;
  if (!isFiniteNumber(lat_deg) || !isFiniteNumber(lon_deg) || !isFiniteNumber(altitude_m)) {
    return null;
  }
  return {
    type: "waypoint",
    lat_deg,
    lon_deg,
    altitude_m,
    hold_s: isFiniteNumber(value["hold_s"]) ? value["hold_s"] : 0,
    accept_radius_m: isFiniteNumber(value["accept_radius_m"])
      ? value["accept_radius_m"]
      : 0,
  };
}

function checkLand(
  value: Record<string, unknown>,
  path: string,
  issues: MissionIssue[],
): LandItem | null {
  extraKeys(
    value,
    ["type", "lat_deg", "lon_deg", "altitude_m", "abort_alt_m"],
    path,
    issues,
  );
  checkFiniteRange(value["lat_deg"], `${path}.lat_deg`, issues, { min: -90, max: 90 });
  checkFiniteRange(value["lon_deg"], `${path}.lon_deg`, issues, { min: -180, max: 180 });
  checkFiniteRange(value["altitude_m"], `${path}.altitude_m`, issues, { exclusiveMin: 0 });
  if (value["abort_alt_m"] !== undefined) {
    checkFiniteRange(value["abort_alt_m"], `${path}.abort_alt_m`, issues, { min: 0 });
  }
  const { lat_deg, lon_deg, altitude_m } = value;
  if (!isFiniteNumber(lat_deg) || !isFiniteNumber(lon_deg) || !isFiniteNumber(altitude_m)) {
    return null;
  }
  return {
    type: "land",
    lat_deg,
    lon_deg,
    altitude_m,
    abort_alt_m: isFiniteNumber(value["abort_alt_m"]) ? value["abort_alt_m"] : 0,
  };
}

function checkRtl(
  value: Record<string, unknown>,
  path: string,
  issues: MissionIssue[],
): RtlItem | null {
  extraKeys(value, ["type"], path, issues);
  return { type: "rtl" };
}

function checkItem(
  value: unknown,
  index: number,
  issues: MissionIssue[],
): MissionItem | null {
  const path = `items[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: "must be an object" });
    return null;
  }
  const type = value["type"];
  if (typeof type !== "string" || !ITEM_TYPES.has(type)) {
    issues.push({
      path: `${path}.type`,
      message: `unknown item type ${JSON.stringify(type)}; expected takeoff/waypoint/land/rtl`,
    });
    return null;
  }
  switch (type) {
    case "takeoff":
      return checkTakeoff(value, path, issues);
    case "waypoint":
      return checkWaypoint(value, path, issues);
    case "land":
      return checkLand(value, path, issues);
    case "rtl":
      return checkRtl(value, path, issues);
  }
  // Unreachable: the ITEM_TYPES guard above covers exactly these cases.
  return null;
}

/**
 * Validate and normalize an unknown value into a MissionV1 document with
 * canonical optional fields (`hold_s` / `accept_radius_m` / `abort_alt_m`
 * filled with mavctl's defaults). Returns every issue found plus the
 * normalized mission (null when the document is not buildable).
 */
export function normalizeMission(value: unknown): {
  issues: MissionIssue[];
  mission: MissionV1 | null;
} {
  const issues: MissionIssue[] = [];
  if (!isRecord(value)) {
    issues.push({ path: "$", message: "mission must be a JSON object" });
    return { issues, mission: null };
  }
  extraKeys(value, ["version", "items"], "$", issues);

  const version = value["version"];
  if (!isStrictInt(version) || version !== 1) {
    issues.push({
      path: "$.version",
      message: "unsupported mission schema version; expected exactly 1",
    });
  }

  const rawItems = value["items"];
  if (!Array.isArray(rawItems)) {
    issues.push({ path: "$.items", message: "must be an array" });
    return { issues, mission: null };
  }
  if (rawItems.length < 1) {
    issues.push({ path: "$.items", message: "upload missions must not be empty" });
    return { issues, mission: null };
  }
  if (rawItems.length > MISSION_MAX_ITEMS) {
    issues.push({
      path: "$.items",
      message: `mission exceeds the ${MISSION_MAX_ITEMS}-item limit (${rawItems.length})`,
    });
  }

  const items: MissionItem[] = [];
  rawItems.forEach((raw, index) => {
    const item = checkItem(raw, index, issues);
    if (item !== null) {
      items.push(item);
    }
  });

  if (items.length > 0 && items[0]?.type !== "takeoff") {
    issues.push({
      path: "items[0].type",
      message: "first mission item must be 'takeoff' (ArduCopter-first v1 constraint)",
    });
  }
  items.slice(0, -1).forEach((item, index) => {
    if (item.type === "land" || item.type === "rtl") {
      issues.push({
        path: `items[${index}].type`,
        message: `no items may follow terminal 'land'/'rtl' item at index ${index}`,
      });
    }
  });

  // The normalized document is only produced when every raw item parsed
  // into a typed item; otherwise callers get the issues and no document.
  const mission: MissionV1 | null =
    issues.length === 0 && items.length === rawItems.length
      ? { version: 1, items }
      : null;
  return { issues, mission };
}

/**
 * Validate an unknown value as an upload-shaped Mission JSON v1 document.
 * Returns every issue found; an empty list means the document mirrors
 * what mavctl's Mission JSON v1 accepts. Sequence rules (takeoff-first,
 * terminal-terminated) match mavctl's model validators.
 */
export function validateMission(value: unknown): MissionIssue[] {
  return normalizeMission(value).issues;
}

/** Type guard after a clean `validateMission` run. */
export function isMissionV1(value: unknown): value is MissionV1 {
  return validateMission(value).length === 0;
}
