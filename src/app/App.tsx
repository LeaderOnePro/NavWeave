/** NavWeave planning app: canvas + waypoint editor + preview + export.
 *
 * v0 scope: planning, validation, preview, export/import. The mavctl
 * dry-run bridge lands behind an explicit opt-in (see src/bridge/).
 */
import { useMemo, useRef, useState } from "react";

import { SafetyBanner } from "../components/SafetyBanner";
import { MissionMapCanvas } from "../components/MissionMapCanvas";
import { MissionPreview } from "../components/MissionPreview";
import { VehicleStatusPanel } from "../components/VehicleStatusPanel";
import { WaypointList } from "../components/WaypointList";
import {
  createMissionFromPlannerState,
  createPlannerStateFromMission,
  initialPlannerState,
} from "../mission/transforms";
import { isMissionV1, validateMission } from "../mission/validation";
import { serializeMission } from "../mission/serialize";
import { createMockVehicleStatus } from "../vehicle/mockVehicle";
import { usePlanner } from "../hooks/usePlanner";

export function App() {
  const planner = usePlanner();
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mission = useMemo(
    () => createMissionFromPlannerState(planner.planner),
    [planner.planner],
  );
  const issues = useMemo(() => validateMission(mission), [mission]);
  const json = useMemo(() => serializeMission(mission), [mission]);
  const vehicleStatus = useMemo(
    () => createMockVehicleStatus(planner.mockToggles),
    [planner.mockToggles],
  );

  const exportMission = () => {
    const blob = new Blob([`${json}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mission.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importMission = async (file: File) => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (error) {
      setImportError(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    const missionResult = validateMission(parsed);
    if (missionResult.length > 0) {
      setImportError(
        `rejected: ${missionResult.length} validation issue(s), first: ${missionResult[0]?.path} ${missionResult[0]?.message}`,
      );
      return;
    }
    if (!isMissionV1(parsed)) {
      setImportError("rejected: not a Mission JSON v1 document");
      return;
    }
    setImportError(null);
    planner.setHome(initialPlannerState().home);
    const restored = createPlannerStateFromMission(
      parsed,
      initialPlannerState().home,
    );
    // Replace the whole planner with the imported plan (waypoints + altitude).
    planner.setGlobalAltitude(restored.globalAltitudeM);
    // The hook owns state; reuse update calls for each waypoint is awkward —
    // import swaps the waypoint array wholesale through setHome + a dedicated
    // replace below.
    planner.replaceWaypoints(restored.waypoints);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>NavWeave — Mission Planning</h1>
        <p className="app-tagline">
          NavWeave plans and reviews missions. mavctl executes them safely.
        </p>
      </header>
      <SafetyBanner />
      <main className="app-main">
        <MissionMapCanvas
          home={planner.planner.home}
          vehiclePosition={planner.planner.vehiclePosition}
          waypoints={planner.planner.waypoints}
          selectedWaypointId={planner.selectedWaypointId}
          pixelsPerMetre={1.2}
          onAddWaypoint={planner.addWaypointAt}
          onSelectWaypoint={planner.selectWaypoint}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
          <VehicleStatusPanel mode="mock" status={vehicleStatus} />
          <div className="panel" data-testid="mock-toggles-panel">
            <h2>Mock state (development)</h2>
            <label style={{ marginRight: "0.75rem" }}>
              connected
              <select
                aria-label="mock connected toggle"
                value={planner.mockToggles.connected ? "yes" : "no"}
                onChange={(event) =>
                  planner.setMockToggles({
                    ...planner.mockToggles,
                    connected: event.target.value === "yes",
                  })
                }
              >
                <option value="yes">connected</option>
                <option value="no">disconnected</option>
              </select>
            </label>
            <label style={{ marginRight: "0.75rem" }}>
              gps
              <select
                aria-label="mock gps toggle"
                value={planner.mockToggles.gpsReady ? "ready" : "unavailable"}
                onChange={(event) =>
                  planner.setMockToggles({
                    ...planner.mockToggles,
                    gpsReady: event.target.value === "ready",
                  })
                }
              >
                <option value="ready">rtk_fixed</option>
                <option value="unavailable">no_gps</option>
              </select>
            </label>
            <label>
              health
              <select
                aria-label="mock health toggle"
                value={planner.mockToggles.healthObserved ? "observed" : "unknown"}
                onChange={(event) =>
                  planner.setMockToggles({
                    ...planner.mockToggles,
                    healthObserved: event.target.value === "observed",
                  })
                }
              >
                <option value="observed">observed</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
          </div>
          <WaypointList
            waypoints={planner.planner.waypoints}
            globalAltitudeM={planner.planner.globalAltitudeM}
            selectedWaypointId={planner.selectedWaypointId}
            onGlobalAltitudeChange={planner.setGlobalAltitude}
            onAltitudeChange={(id, altitudeM) => planner.updateWaypoint(id, { altitudeM })}
            onHoldChange={(id, holdS) => planner.updateWaypoint(id, { holdS })}
            onAcceptRadiusChange={(id, acceptRadiusM) =>
              planner.updateWaypoint(id, { acceptRadiusM })
            }
            onMove={planner.moveWaypoint}
            onDelete={planner.deleteWaypoint}
          />
          <div className="panel" data-testid="export-import-panel">
            <h2>Export / Import</h2>
            <button type="button" onClick={exportMission} data-testid="export-button">
              Export mission.json
            </button>{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              data-testid="import-button"
            >
              Import mission.json
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              aria-label="import mission json file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  void importMission(file);
                }
              }}
            />
            {importError !== null && (
              <p className="validation-list" data-testid="import-error" style={{ marginTop: "0.4rem" }}>
                {importError}
              </p>
            )}
          </div>
          <MissionPreview json={json} issues={issues} />
        </div>
      </main>
    </div>
  );
}
