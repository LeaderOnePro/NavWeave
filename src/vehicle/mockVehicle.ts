/**
 * Deterministic mock vehicle state for the planning POC. The UI must always
 * label this as `Mode: Mock` — nothing here is a live vehicle.
 */
import type { VehicleStatus } from "./types";

export interface MockVehicleToggles {
  connected: boolean;
  gpsReady: boolean;
  healthObserved: boolean;
}

export const DEFAULT_MOCK_TOGGLES: MockVehicleToggles = {
  connected: true,
  gpsReady: true,
  healthObserved: true,
};

const MOCK_HOME = { lat_deg: -35.363262, lon_deg: 149.165237 };

export function createMockVehicleStatus(
  toggles: MockVehicleToggles = DEFAULT_MOCK_TOGGLES,
): VehicleStatus {
  return {
    connected: toggles.connected,
    armed: toggles.connected ? false : null,
    flight_mode: toggles.connected ? "GUIDED" : null,
    gps: toggles.connected && toggles.gpsReady
      ? { fix_type: 6, fix_label: "rtk_fixed" }
      : toggles.connected
        ? { fix_type: 0, fix_label: "no_gps" }
        : null,
    home_position: toggles.connected ? MOCK_HOME : null,
    position: toggles.connected ? MOCK_HOME : null,
    health: {
      estimator: toggles.connected && toggles.healthObserved
        ? { status: "observed", age_s: 0.4 }
        : { status: "unknown", age_s: null },
    },
  };
}
