/**
 * Waypoint list: the derived mission sequence is shown with auto-generated
 * `takeoff`/`rtl` rows visible and clearly labelled; editing applies to the
 * planner waypoints (which the mission derives from).
 */
import type { PlannerWaypoint } from "../mission/transforms";

export interface WaypointListProps {
  waypoints: readonly PlannerWaypoint[];
  globalAltitudeM: number;
  selectedWaypointId: string | null;
  onGlobalAltitudeChange(altitudeM: number): void;
  onAltitudeChange(waypointId: string, altitudeM: number): void;
  onHoldChange(waypointId: string, holdS: number): void;
  onAcceptRadiusChange(waypointId: string, acceptRadiusM: number): void;
  onMove(waypointId: string, direction: "up" | "down"): void;
  onDelete(waypointId: string): void;
}

export function WaypointList({
  waypoints,
  globalAltitudeM,
  selectedWaypointId,
  onGlobalAltitudeChange,
  onAltitudeChange,
  onHoldChange,
  onAcceptRadiusChange,
  onMove,
  onDelete,
}: WaypointListProps) {
  return (
    <div className="panel" data-testid="waypoint-list">
      <h2>Mission items</h2>
      <label style={{ display: "block", marginBottom: "0.4rem" }}>
        global altitude (m)
        <input
          type="number"
          min={0.1}
          step={1}
          value={globalAltitudeM}
          aria-label="global altitude"
          onChange={(event) => onGlobalAltitudeChange(Number(event.target.value))}
        />
      </label>
      <ul className="waypoint-list">
        <li data-testid="auto-row-takeoff">
          <span className="waypoint-index">1</span>
          <span style={{ color: "#9aa4b2" }}>takeoff → {globalAltitudeM} m (auto)</span>
        </li>
        {waypoints.map((wp, index) => {
          const selected = wp.id === selectedWaypointId;
          const rowNumber = index + 2; // takeoff occupies row 1
          return (
            <li
              key={wp.id}
              style={selected ? { outline: "1px solid #c678dd" } : undefined}
              data-testid={`waypoint-row-${rowNumber}`}
            >
              <span className="waypoint-index">{rowNumber}</span>
              <span>waypoint</span>
              <label>
                alt
                <input
                  type="number"
                  min={0.1}
                  step={1}
                  value={wp.altitudeM}
                  aria-label={`waypoint ${rowNumber} altitude`}
                  onChange={(event) => onAltitudeChange(wp.id, Number(event.target.value))}
                />
              </label>
              <label>
                hold
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={wp.holdS}
                  aria-label={`waypoint ${rowNumber} hold seconds`}
                  onChange={(event) => onHoldChange(wp.id, Number(event.target.value))}
                />
              </label>
              <label>
                radius
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={wp.acceptRadiusM}
                  aria-label={`waypoint ${rowNumber} acceptance radius`}
                  onChange={(event) =>
                    onAcceptRadiusChange(wp.id, Number(event.target.value))
                  }
                />
              </label>
              <button
                type="button"
                aria-label={`move waypoint ${rowNumber} up`}
                onClick={() => onMove(wp.id, "up")}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`move waypoint ${rowNumber} down`}
                onClick={() => onMove(wp.id, "down")}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`delete waypoint ${rowNumber}`}
                onClick={() => onDelete(wp.id)}
              >
                ×
              </button>
            </li>
          );
        })}
        <li data-testid="auto-row-rtl">
          <span className="waypoint-index">{waypoints.length + 2}</span>
          <span style={{ color: "#9aa4b2" }}>rtl (terminal, auto)</span>
        </li>
      </ul>
    </div>
  );
}
