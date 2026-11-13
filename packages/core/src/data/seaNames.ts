/**
 * The seas' names (ATLAS-440, the dev, 2026-11-13): eight seas named on the map, **fixed** — placed once, by hand, on
 * a given space, never computed as the countries' names are, and the same whatever the century. Held here because they
 * are data, not drawing: the atlas lays them, a later Cartographer could show them.
 *
 * Each name follows an arc across its sea — Claude's proposal, for the dev to tune on sight.
 */

/** A point of the map, in degrees. */
export interface LonLat {
  /** Degrees of longitude, east positive. */
  readonly lon: number
  /** Degrees of latitude, north positive. */
  readonly lat: number
}

/**
 * A sea named on the map, **along an arc** (the dev, 2026-11-13: *« ça peut pas être droit »*, and the name must fill
 * its sea): a quadratic curve from `from` to `to`, bent toward `bend`. The name stretches along it, from its start to
 * its end — the arc's length sets the name's size.
 */
export interface SeaName {
  /** Its key. */
  readonly id: string
  /** Its name in each language. */
  readonly name: { readonly fr: string; readonly en: string }
  /** Where the name begins. */
  readonly from: LonLat
  /** The point the arc bends toward — not on it: a quadratic curve's control point. */
  readonly bend: LonLat
  /** Where the name ends. */
  readonly to: LonLat
}

/**
 * The eight seas, the dev's list, each arc drawn by Claude to fill its sea, read off the map — to tune on sight. Inside
 * the map's frame (`years/index.json`: 45°W–78.75°E, 11.2°N–76.8°N) — the Indian Ocean by its Arabian Sea, the one part
 * of it the frame holds.
 */
export const SEA_NAMES: readonly SeaName[] = [
  {
    id: 'atlantic',
    name: { fr: 'Océan Atlantique', en: 'Atlantic Ocean' },
    from: { lon: -36, lat: 32 },
    bend: { lon: -21, lat: 44 },
    to: { lon: -24, lat: 59 },
  },
  {
    id: 'north-sea',
    name: { fr: 'Mer du Nord', en: 'North Sea' },
    from: { lon: 1.2, lat: 52.8 },
    bend: { lon: 6.4, lat: 56 },
    to: { lon: 3.2, lat: 60.6 },
  },
  {
    id: 'baltic',
    name: { fr: 'Mer Baltique', en: 'Baltic Sea' },
    from: { lon: 15.4, lat: 55.2 },
    bend: { lon: 21.2, lat: 55.4 },
    to: { lon: 20.4, lat: 59.2 },
  },
  {
    id: 'mediterranean',
    name: { fr: 'Mer Méditerranée', en: 'Mediterranean Sea' },
    from: { lon: 2, lat: 39.2 },
    bend: { lon: 17, lat: 37.2 },
    to: { lon: 31, lat: 33.2 },
  },
  {
    id: 'black-sea',
    name: { fr: 'Mer Noire', en: 'Black Sea' },
    from: { lon: 29.6, lat: 43 },
    bend: { lon: 34.5, lat: 44.8 },
    to: { lon: 40, lat: 42.4 },
  },
  {
    id: 'caspian',
    name: { fr: 'Mer Caspienne', en: 'Caspian Sea' },
    from: { lon: 51, lat: 45 },
    bend: { lon: 49.6, lat: 42 },
    to: { lon: 51.6, lat: 38.8 },
  },
  {
    id: 'red-sea',
    name: { fr: 'Mer Rouge', en: 'Red Sea' },
    from: { lon: 34.2, lat: 27 },
    bend: { lon: 38.8, lat: 22.6 },
    to: { lon: 41.8, lat: 15.6 },
  },
  {
    id: 'indian',
    name: { fr: 'Océan Indien', en: 'Indian Ocean' },
    from: { lon: 56.5, lat: 15.5 },
    bend: { lon: 63, lat: 11.5 },
    to: { lon: 70.5, lat: 17 },
  },
]

/**
 * A point of a sea's arc: the quadratic curve from `from` to `to`, bent toward `bend`.
 * @param sea - the sea
 * @param t - how far along, `0` at its start, `1` at its end
 * @returns the point, in degrees
 */
export function seaArcAt(sea: SeaName, t: number): LonLat {
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return {
    lon: a * sea.from.lon + b * sea.bend.lon + c * sea.to.lon,
    lat: a * sea.from.lat + b * sea.bend.lat + c * sea.to.lat,
  }
}

/** How see-through the seas' names are (the dev: « à peu près 30 à 40 % », then « un petit peu moins »). */
export const SEA_NAME_OPACITY = 0.28

/**
 * A sea's name as the map writes it: **in capitals** (the dev, 2026-11-13: *« à essayer »*, unlike the countries') — the
 * one line to change to try them otherwise.
 * @param sea - the sea
 * @returns its name, written
 */
export function seaNameText(sea: SeaName): string {
  return sea.name.en.toUpperCase()
}
