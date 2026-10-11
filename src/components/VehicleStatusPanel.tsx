/** Vehicle status panel. Always shows the bridge mode — Mock must never be
 * mistaken for a live vehicle. */
import type { VehicleStatus } from "../vehicle/types";

export interface VehicleStatusPanelProps {
  mode: "mock" | "local";
  status: VehicleStatus;
}

export function VehicleStatusPanel({ mode, status }: VehicleStatusPanelProps) {
  return (
    <div className="panel" data-testid="vehicle-status-panel">
      <h2>Vehicle</h2>
      <p style={{ margin: "0 0 0.4rem" }}>
        Mode: <strong data-testid="bridge-mode">{mode === "mock" ? "Mock" : "Local dry-run"}</strong>
      </p>
      <ul className="waypoint-list" style={{ fontSize: "0.85rem" }}>
        <li data-testid="status-connected">
          connected: {status.connected ? "yes" : "no"}
        </li>
        <li data-testid="status-armed">
          armed: {status.armed === null ? "unknown" : status.armed ? "ARMED" : "disarmed"}
        </li>
        <li data-testid="status-mode">mode: {status.flight_mode ?? "n/a"}</li>
        <li data-testid="status-gps">
          gps: {status.gps ? `${status.gps.fix_label} (fix ${status.gps.fix_type})` : "n/a"}
        </li>
        <li data-testid="status-home">
          home:{" "}
          {status.home_position
            ? `${status.home_position.lat_deg.toFixed(6)}, ${status.home_position.lon_deg.toFixed(6)}`
            : "n/a"}
        </li>
        <li data-testid="status-health">
          health: estimator={status.health.estimator.status}
          {status.health.estimator.age_s === null ? " (never observed)" : ` (${status.health.estimator.age_s}s)`}
        </li>
      </ul>
    </div>
  );
}
