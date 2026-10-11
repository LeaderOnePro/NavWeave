/** Planner-side SVG mapping helpers: lat/lon ⇄ canvas pixels.

 * Equirectangular approximation around the home latitude — fine for the
 * kilometre scales a planning POC deals with; not a projection library.
 */

export interface MapWindow {
  /** Center of the window (home position). */
  centerLatDeg: number;
  centerLonDeg: number;
  /** Pixels per metre of ground distance. */
  pixelsPerMetre: number;
}

const METRES_PER_DEG_LAT = 110_574;
const METRES_PER_DEG_LON_AT_EQUATOR = 111_320;

export function latLonToPixels(
  latDeg: number,
  lonDeg: number,
  window: MapWindow,
  widthPx: number,
  heightPx: number,
): { x: number; y: number } {
  const metresPerDegLon =
    METRES_PER_DEG_LON_AT_EQUATOR * Math.cos((window.centerLatDeg * Math.PI) / 180);
  const dxMetres = (lonDeg - window.centerLonDeg) * metresPerDegLon;
  const dyMetres = (latDeg - window.centerLatDeg) * METRES_PER_DEG_LAT;
  return {
    x: widthPx / 2 + dxMetres * window.pixelsPerMetre,
    y: heightPx / 2 - dyMetres * window.pixelsPerMetre,
  };
}

export function pixelsToLatLon(
  xPx: number,
  yPx: number,
  window: MapWindow,
  widthPx: number,
  heightPx: number,
): { latDeg: number; lonDeg: number } {
  const metresPerDegLon =
    METRES_PER_DEG_LON_AT_EQUATOR * Math.cos((window.centerLatDeg * Math.PI) / 180);
  const dxMetres = (xPx - widthPx / 2) / window.pixelsPerMetre;
  const dyMetres = (heightPx / 2 - yPx) / window.pixelsPerMetre;
  return {
    latDeg: window.centerLatDeg + dyMetres / METRES_PER_DEG_LAT,
    lonDeg: window.centerLonDeg + dxMetres / metresPerDegLon,
  };
}
