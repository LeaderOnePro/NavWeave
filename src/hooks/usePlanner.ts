/** Planner state management (pure React state, no external store). */
import { useCallback, useState } from "react";

import {
  initialPlannerState,
  makeWaypoint,
  type PlannerHome,
  type PlannerState,
  type PlannerWaypoint,
} from "../mission/transforms";
import { DEFAULT_MOCK_TOGGLES, type MockVehicleToggles } from "../vehicle/mockVehicle";

export interface UsePlannerResult {
  planner: PlannerState;
  selectedWaypointId: string | null;
  mockToggles: MockVehicleToggles;
  addWaypointAt(latDeg: number, lonDeg: number): void;
  selectWaypoint(id: string | null): void;
  deleteWaypoint(id: string): void;
  moveWaypoint(id: string, direction: "up" | "down"): void;
  updateWaypoint(id: string, patch: Partial<Omit<PlannerWaypoint, "id">>): void;
  setGlobalAltitude(altitudeM: number): void;
  setMockToggles(toggles: MockVehicleToggles): void;
  setHome(home: PlannerHome): void;
  /** Wholesale waypoint replacement (import flow). */
  replaceWaypoints(waypoints: PlannerWaypoint[]): void;
}

/**
 * Waypoint ids are `useCallback`-stable via makeWaypoint; the planner keeps
 * insertion order and always plans `takeoff → waypoints → rtl`.
 */
export function usePlanner(): UsePlannerResult {
  const [planner, setPlanner] = useState<PlannerState>(initialPlannerState);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [mockToggles, setMockToggles] = useState<MockVehicleToggles>(DEFAULT_MOCK_TOGGLES);

  const addWaypointAt = useCallback((latDeg: number, lonDeg: number) => {
    setPlanner((current) => ({
      ...current,
      waypoints: [...current.waypoints, makeWaypoint(current, latDeg, lonDeg)],
    }));
  }, []);

  const selectWaypoint = useCallback((id: string | null) => {
    setSelectedWaypointId(id);
  }, []);

  const deleteWaypoint = useCallback((id: string) => {
    setPlanner((current) => ({
      ...current,
      waypoints: current.waypoints.filter((wp) => wp.id !== id),
    }));
    setSelectedWaypointId((current) => (current === id ? null : current));
  }, []);

  const moveWaypoint = useCallback((id: string, direction: "up" | "down") => {
    setPlanner((current) => {
      const index = current.waypoints.findIndex((wp) => wp.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= current.waypoints.length) {
        return current;
      }
      const waypoints = [...current.waypoints];
      const [moved] = waypoints.splice(index, 1);
      if (moved === undefined) {
        return current;
      }
      waypoints.splice(target, 0, moved);
      return { ...current, waypoints };
    });
  }, []);

  const updateWaypoint = useCallback(
    (id: string, patch: Partial<Omit<PlannerWaypoint, "id">>) => {
      setPlanner((current) => ({
        ...current,
        waypoints: current.waypoints.map((wp) => (wp.id === id ? { ...wp, ...patch } : wp)),
      }));
    },
    [],
  );

  const setGlobalAltitude = useCallback((altitudeM: number) => {
    setPlanner((current) => ({ ...current, globalAltitudeM: altitudeM }));
  }, []);

  const setHome = useCallback((home: PlannerHome) => {
    setPlanner((current) => ({
      ...current,
      home,
      vehiclePosition: home,
    }));
  }, []);

  const replaceWaypoints = useCallback((waypoints: PlannerWaypoint[]) => {
    setPlanner((current) => ({ ...current, waypoints }));
    setSelectedWaypointId(null);
  }, []);

  return {
    planner,
    selectedWaypointId,
    mockToggles,
    addWaypointAt,
    selectWaypoint,
    deleteWaypoint,
    moveWaypoint,
    updateWaypoint,
    setGlobalAltitude,
    setMockToggles,
    setHome,
    replaceWaypoints,
  };
}
