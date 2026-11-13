/**
 * The seas' names (ATLAS-440, the dev, 2026-11-13): eight seas named on the map, **fixed** — placed once, by hand, on
 * a given space, never computed as the countries' names are, and the same whatever the century. Held here because they
 * are data, not drawing: the atlas lays them, a later Cartographer could show them.
 *
 * Each name lies on its sea along an axis, at a length — a first proposal by Claude, read off the land mask, for the
 * dev to tune on sight.
 */

/** A sea named on the map. */
export interface SeaName {
  /** Its key. */
  readonly id: string
  /** Its name in each language. */
  readonly name: { readonly fr: string; readonly en: string }
  /** The middle of the name, in degrees of longitude. */
  readonly lon: number
  /** The middle of the name, in degrees of latitude. */
  readonly lat: number
  /** The name's direction, in degrees counter-clockwise from east — `0` reads west to east. */
  readonly angleDeg: number
  /** The name's length on the map, in degrees of longitude — what sets its size. */
  readonly lengthDeg: number
}

/**
 * The eight seas, the dev's list. Inside the map's frame (`years/index.json`: 45°W–78.75°E, 11.2°N–76.8°N) — the
 * Indian Ocean by its Arabian Sea, the one part of it the frame holds.
 */
export const SEA_NAMES: readonly SeaName[] = [
  {
    id: 'atlantic',
    name: { fr: 'Océan Atlantique', en: 'Atlantic Ocean' },
    lon: -24,
    lat: 44,
    angleDeg: 70,
    lengthDeg: 26,
  },
  {
    id: 'north-sea',
    name: { fr: 'Mer du Nord', en: 'North Sea' },
    lon: 3.2,
    lat: 56.2,
    angleDeg: 72,
    lengthDeg: 6,
  },
  {
    id: 'baltic',
    name: { fr: 'Mer Baltique', en: 'Baltic Sea' },
    lon: 18.8,
    lat: 56.8,
    angleDeg: 62,
    lengthDeg: 5,
  },
  {
    id: 'mediterranean',
    name: { fr: 'Mer Méditerranée', en: 'Mediterranean Sea' },
    lon: 18,
    lat: 34.2,
    angleDeg: -4,
    lengthDeg: 16,
  },
  {
    id: 'black-sea',
    name: { fr: 'Mer Noire', en: 'Black Sea' },
    lon: 34,
    lat: 43.3,
    angleDeg: 0,
    lengthDeg: 8,
  },
  {
    id: 'caspian',
    name: { fr: 'Mer Caspienne', en: 'Caspian Sea' },
    lon: 50.6,
    lat: 42.2,
    angleDeg: -78,
    lengthDeg: 2.8,
  },
  {
    id: 'red-sea',
    name: { fr: 'Mer Rouge', en: 'Red Sea' },
    lon: 38.2,
    lat: 20.6,
    angleDeg: -58,
    lengthDeg: 5,
  },
  {
    id: 'indian',
    name: { fr: 'Océan Indien', en: 'Indian Ocean' },
    lon: 63,
    lat: 16,
    angleDeg: 0,
    lengthDeg: 14,
  },
]

/** How see-through the seas' names are (the dev: « à peu près 30 à 40 % »). */
export const SEA_NAME_OPACITY = 0.35

/**
 * A sea's name as the map writes it: **in capitals** (the dev, 2026-11-13: *« à essayer »*, unlike the countries') — the
 * one line to change to try them otherwise.
 * @param sea - the sea
 * @returns its name, written
 */
export function seaNameText(sea: SeaName): string {
  return sea.name.en.toUpperCase()
}
