/** Dry-run review panel: bridge mode selection, explicit local-mode
 * warning, and the normalized mavctl result (checks, reason, hint). */
import type { BridgeMode, DryRunResult, MockScenario } from "../bridge/types";

export interface DryRunPanelProps {
  mode: BridgeMode;
  scenario: MockScenario;
  binary: string;
  isValidMission: boolean;
  busy: boolean;
  /** Browser POC: spawning mavctl needs the future local host bridge. */
  localSpawnUnavailable?: boolean;
  result: DryRunResult | null;
  onModeChange(mode: BridgeMode): void;
  onScenarioChange(scenario: MockScenario): void;
  onBinaryChange(binary: string): void;
  onRunDryRun(): void;
}

const SCENARIOS: readonly MockScenario[] = [
  "pass",
  "mission_requires_disarmed",
  "ground_state_stale",
  "not_connected",
  "invalid_mission",
];

export function DryRunPanel({
  mode,
  scenario,
  binary,
  isValidMission,
  busy,
  localSpawnUnavailable = false,
  result,
  onModeChange,
  onScenarioChange,
  onBinaryChange,
  onRunDryRun,
}: DryRunPanelProps) {
  return (
    <div className="panel" data-testid="dry-run-panel">
      <h2>mavctl dry-run</h2>
      <label style={{ marginRight: "0.75rem" }}>
        bridge
        <select
          aria-label="bridge mode"
          value={mode}
          onChange={(event) => onModeChange(event.target.value as BridgeMode)}
        >
          <option value="mock">Mock (default)</option>
          <option value="local">Local dry-run mode</option>
        </select>
      </label>
      {mode === "local" ? (
        <>
          <p
            className="safety-banner"
            style={{ margin: "0.4rem 0" }}
            data-testid="local-dry-run-warning"
          >
            <strong>Local dry-run mode.</strong> This will only run
            <code> mavctl mission upload --dry-run</code>. No mission is
            uploaded and no vehicle state is changed.
          </p>
          <label style={{ marginRight: "0.75rem" }}>
            mavctl binary
            <input
              type="text"
              value={binary}
              aria-label="mavctl binary path"
              onChange={(event) => onBinaryChange(event.target.value)}
            />
          </label>
        </>
      ) : (
        <label>
          mock scenario
          <select
            aria-label="mock scenario"
            value={scenario}
            onChange={(event) => onScenarioChange(event.target.value as MockScenario)}
          >
            {SCENARIOS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div style={{ marginTop: "0.5rem" }}>
        <button
          type="button"
          data-testid="run-dry-run-button"
          disabled={!isValidMission || busy || (mode === "local" && localSpawnUnavailable)}
          onClick={onRunDryRun}
        >
          Run dry-run validation
        </button>
        {!isValidMission && (
          <span style={{ color: "#e06c75", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
            fix validation issues to enable
          </span>
        )}
        {mode === "local" && localSpawnUnavailable && (
          <p
            style={{ color: "#9aa4b2", margin: "0.3rem 0 0", fontSize: "0.85rem" }}
            data-testid="local-spawn-unavailable"
          >
            Browser POC: spawning mavctl requires the future local host bridge.
            The Node-side LocalMavctlClient is implemented and unit-tested; see
            docs/ROADMAP.md.
          </p>
        )}
      </div>

      {result !== null && (
        <div data-testid="dry-run-result" style={{ marginTop: "0.5rem" }}>
          <p style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>
            <strong>{result.ok ? "PASS" : "REJECTED"}</strong> exit={result.exit_code}
            {result.reason !== null && <span> reason={result.reason}</span>}
          </p>
          <p style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>{result.message}</p>
          {result.hint !== null && (
            <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "#9aa4b2" }}>
              hint: {result.hint}
            </p>
          )}
          {result.checks.length > 0 && (
            <ul className="waypoint-list" style={{ fontSize: "0.85rem" }}>
              {result.checks.map((check) => (
                <li key={check.name}>
                  {check.passed ? "✓" : "✗"} {check.name}: {check.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
