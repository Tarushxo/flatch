/*
 * Where a flat is shown to be, as opposed to where it is.
 *
 * The exact point never leaves the server before a match (SPEC 10.1). What is
 * sent instead is that point snapped to a grid of roughly 400 m squares, then
 * moved by an offset that is fixed for each flat. The snap hides where in the
 * square the flat is; the offset stops the grid corners themselves from being
 * a giveaway. The same flat always gets the same public point, so repeated
 * requests cannot be averaged to find the real one.
 */

export type LatLng = { lat: number; lng: number };

/** The grid's square size in degrees of latitude: about 400 m. */
const GRID_DEGREES = 0.0036;
/** The furthest the fixed offset moves a point, in degrees of latitude: about 150 m. */
const MAX_SHIFT_DEGREES = 0.00135;

/** A stable number from 0 up to (not including) 1, from any text. */
function unit(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/** The point the world is allowed to see for a flat at `exact`. `key` is anything fixed per flat. */
export function publicLocation(exact: LatLng, key: string): LatLng {
  const snappedLat = (Math.floor(exact.lat / GRID_DEGREES) + 0.5) * GRID_DEGREES;
  // A degree of longitude is shorter away from the equator, so the grid is widened to stay
  // square. The widening is worked out from the snapped latitude, so it is the same for every
  // point in a square.
  const stretch = 1 / Math.max(0.2, Math.cos((snappedLat * Math.PI) / 180));
  const lngGrid = GRID_DEGREES * stretch;
  const snappedLng = (Math.floor(exact.lng / lngGrid) + 0.5) * lngGrid;

  const angle = unit(`${key}:angle`) * 2 * Math.PI;
  const reach = unit(`${key}:reach`) * MAX_SHIFT_DEGREES;

  return {
    lat: Number((snappedLat + Math.sin(angle) * reach).toFixed(5)),
    lng: Number((snappedLng + Math.cos(angle) * reach * stretch).toFixed(5)),
  };
}

/** Roughly how far apart two points are, in metres. Good enough at city scale. */
export function metresBetween(a: LatLng, b: LatLng): number {
  const latMetres = (a.lat - b.lat) * 111_320;
  const lngMetres = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(latMetres, lngMetres);
}
