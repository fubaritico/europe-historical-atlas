/**
 * Web Mercator (EPSG:3857) projection helpers.
 *
 * The DEM is sampled on a Web Mercator grid, so its normalized `(u, v)` coordinates are linear in
 * *projected* space, not in latitude — `v = 0.5` is nowhere near the mid-latitude of the bounding box.
 * Anything that needs real geography per texel (a latitude-dependent snow line, a graticule, reprojecting
 * vector data such as rivers or historical borders onto the DEM) has to go through these conversions
 * rather than lerping degrees.
 *
 * Pure maths, no dependencies: this layer is a leaf, like `data/`.
 */

/** Degrees → radians. */
const DEG2RAD = Math.PI / 180

/** Radians → degrees. */
const RAD2DEG = 180 / Math.PI

/**
 * The maximum latitude Web Mercator can represent; beyond it the projection diverges. The DEM is capped
 * well below this, but clamping keeps the conversions total rather than returning infinities.
 */
export const MERCATOR_MAX_LATITUDE = 85.05112878

/** A geographic bounding box in degrees. */
export interface GeoBounds {
  /** Western edge, in degrees. */
  west: number
  /** Southern edge, in degrees. */
  south: number
  /** Eastern edge, in degrees. */
  east: number
  /** Northern edge, in degrees. */
  north: number
}

/**
 * Project a latitude to its Web Mercator `y` (in radians of projected space, north positive).
 * @param latitudeDeg - latitude in degrees, clamped to {@link MERCATOR_MAX_LATITUDE}
 * @returns the projected `y`
 */
export function latitudeToMercatorY(latitudeDeg: number): number {
  const clamped = Math.min(MERCATOR_MAX_LATITUDE, Math.max(-MERCATOR_MAX_LATITUDE, latitudeDeg))
  return Math.log(Math.tan(Math.PI / 4 + (clamped * DEG2RAD) / 2))
}

/**
 * Unproject a Web Mercator `y` back to a latitude.
 * @param y - the projected `y` (as produced by {@link latitudeToMercatorY})
 * @returns the latitude in degrees
 */
export function mercatorYToLatitude(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * RAD2DEG
}

/**
 * Convert a normalized vertical texture coordinate into a real latitude, given the grid's bounds.
 * `v = 0` is the grid's north edge (its first row), matching the DEM row order.
 * @param v - normalized vertical coordinate in `[0, 1]`, 0 = north edge
 * @param bounds - the grid's geographic bounds
 * @returns the latitude in degrees
 */
export function verticalToLatitude(v: number, bounds: GeoBounds): number {
  const northY = latitudeToMercatorY(bounds.north)
  const southY = latitudeToMercatorY(bounds.south)
  return mercatorYToLatitude(northY + (southY - northY) * v)
}

/**
 * Convert a latitude into the normalized vertical texture coordinate of a grid — the inverse of
 * {@link verticalToLatitude}. Returns values outside `[0, 1]` for latitudes beyond the bounds.
 * @param latitudeDeg - the latitude in degrees
 * @param bounds - the grid's geographic bounds
 * @returns the normalized vertical coordinate, 0 = north edge
 */
export function latitudeToVertical(latitudeDeg: number, bounds: GeoBounds): number {
  const northY = latitudeToMercatorY(bounds.north)
  const southY = latitudeToMercatorY(bounds.south)
  const span = southY - northY
  if (span === 0) return 0
  return (latitudeToMercatorY(latitudeDeg) - northY) / span
}

/**
 * Convert a longitude into the normalized horizontal texture coordinate of a grid. Web Mercator's `x` is
 * linear in longitude, so this is a plain remap — unlike the vertical axis.
 * @param longitudeDeg - the longitude in degrees
 * @param bounds - the grid's geographic bounds
 * @returns the normalized horizontal coordinate, 0 = west edge
 */
export function longitudeToHorizontal(longitudeDeg: number, bounds: GeoBounds): number {
  const span = bounds.east - bounds.west
  if (span === 0) return 0
  return (longitudeDeg - bounds.west) / span
}

/**
 * Convert a normalized horizontal texture coordinate back into a longitude.
 * @param u - normalized horizontal coordinate in `[0, 1]`, 0 = west edge
 * @param bounds - the grid's geographic bounds
 * @returns the longitude in degrees
 */
export function horizontalToLongitude(u: number, bounds: GeoBounds): number {
  return bounds.west + (bounds.east - bounds.west) * u
}
