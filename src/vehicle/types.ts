/** Vehicle status types mirroring mavctl's `status --json` shape (subset). */

export interface GpsInfo {
  fix_type: number;
  fix_label: string;
}

export interface LatLon {
  lat_deg: number;
  lon_deg: number;
}

export interface VehicleStatus {
  connected: boolean;
  armed: boolean | null;
  flight_mode: string | null;
  gps: GpsInfo | null;
  home_position: LatLon | null;
  position: LatLon | null;
  health: {
    estimator: {
      status: string;
      age_s: number | null;
    };
  };
}

export interface Telemetry {
  position: LatLon | null;
}

export type BridgeMode = "mock" | "local";
