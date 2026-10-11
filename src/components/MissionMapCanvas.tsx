/**
 * Offline SVG planning canvas: coordinate grid, home/vehicle markers,
 * numbered waypoint markers, route polyline, click-to-add. No tiles, no
 * network, no tokens — a MapLibre adapter may replace this later behind
 * the same props contract.
 */
import { useCallback } from "react";

import type { PlannerHome, PlannerWaypoint } from "../mission/transforms";
import { latLonToPixels, pixelsToLatLon, type MapWindow } from "./mapProjection";

const WIDTH = 480;
const HEIGHT = 480;
const GRID_STEP_M = 50;

export interface MissionMapCanvasProps {
  home: PlannerHome;
  vehiclePosition: PlannerHome | null;
  waypoints: readonly PlannerWaypoint[];
  selectedWaypointId: string | null;
  pixelsPerMetre: number;
  onAddWaypoint(latDeg: number, lonDeg: number): void;
  onSelectWaypoint(id: string): void;
}

export function MissionMapCanvas({
  home,
  vehiclePosition,
  waypoints,
  selectedWaypointId,
  pixelsPerMetre,
  onAddWaypoint,
  onSelectWaypoint,
}: MissionMapCanvasProps) {
  const window: MapWindow = {
    centerLatDeg: home.latDeg,
    centerLonDeg: home.lonDeg,
    pixelsPerMetre,
  };

  const toPx = useCallback(
    (lat: number, lon: number) => latLonToPixels(lat, lon, window, WIDTH, HEIGHT),
    // window is rebuilt per render from primitives; home is the only input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [home.latDeg, home.lonDeg, pixelsPerMetre],
  );

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = pixelsToLatLon(
      event.clientX - rect.left,
      event.clientY - rect.top,
      window,
      WIDTH,
      HEIGHT,
    );
    onAddWaypoint(point.latDeg, point.lonDeg);
  };

  const homePx = toPx(home.latDeg, home.lonDeg);
  const vehiclePx = vehiclePosition
    ? toPx(vehiclePosition.latDeg, vehiclePosition.lonDeg)
    : null;
  const waypointPx = waypoints.map((wp) => ({
    wp,
    px: toPx(wp.latDeg, wp.lonDeg),
  }));
  const polylinePoints = waypointPx.map(({ px }) => `${px.x},${px.y}`).join(" ");

  const gridLines: number[] = [];
  for (
    let offset = -Math.ceil(WIDTH / 2 / GRID_STEP_M) * GRID_STEP_M;
    offset <= WIDTH / 2;
    offset += GRID_STEP_M
  ) {
    gridLines.push(offset * pixelsPerMetre + WIDTH / 2);
  }

  return (
    <svg
      className="map-svg"
      data-testid="mission-map-canvas"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      onClick={handleClick}
      role="application"
      aria-label="Mission planning canvas. Click to add a waypoint."
    >
      {gridLines.map((x) => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke="#222a35" strokeWidth={1} />
      ))}
      {gridLines.map((y) => (
        <line key={`h${y}`} x1={0} y1={y} x2={WIDTH} y2={y} stroke="#222a35" strokeWidth={1} />
      ))}

      {/* route polyline (takeoff/home → waypoints) */}
      {waypointPx.length > 0 && (
        <polyline
          points={`${homePx.x},${homePx.y} ${polylinePoints}`}
          fill="none"
          stroke="#61afef"
          strokeWidth={2}
        />
      )}

      {/* home marker: triangle */}
      <polygon
        points={`${homePx.x},${homePx.y - 8} ${homePx.x - 7},${homePx.y + 6} ${homePx.x + 7},${homePx.y + 6}`}
        fill="#98c379"
        data-testid="home-marker"
      />
      <text x={homePx.x + 10} y={homePx.y + 4} fill="#98c379" fontSize={11}>
        home
      </text>

      {/* vehicle marker: circle */}
      {vehiclePx !== null && (
        <circle cx={vehiclePx.x} cy={vehiclePx.y} r={5} fill="#e5c07b" data-testid="vehicle-marker" />
      )}

      {/* waypoint markers: numbered circles */}
      {waypointPx.map(({ wp, px }, index) => (
        <g
          key={wp.id}
          onClick={
            (event) => {
              event.stopPropagation();
              onSelectWaypoint(wp.id);
            }
          }
          style={{ cursor: "pointer" }}
          data-testid={`waypoint-marker-${index + 1}`}
        >
          <circle
            cx={px.x}
            cy={px.y}
            r={9}
            fill={wp.id === selectedWaypointId ? "#c678dd" : "#61afef"}
            stroke="#14171c"
            strokeWidth={2}
          />
          <text
            x={px.x}
            y={px.y + 4}
            textAnchor="middle"
            fill="#14171c"
            fontSize={11}
            fontWeight={700}
          >
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
