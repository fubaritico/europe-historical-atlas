/**
 * Who carries a year's colour: the fill geometry, or the baked texture — asked by the bake, the fills, every frame, and
 * a change of year before it computes anything.
 */

import type { MapSources } from '../../sources/mapSources'
import type { DevState } from '../../tunables/devState'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

/**
 * Whether a year is painted as geometry rather than through the texture: an authored year, with the panel's switch
 * on. Asked of a year not on screen yet by a change of year (`loading/stages/political`), which skips the grid and the
 * bake such a year has no use for (ATLAS-333).
 * @param dev - the live tunables
 * @param year - the year, or `null` when none is loaded
 * @returns `true` when the fills carry the colour — and so the year is an authored one
 */
export function yearPaintsExactFills(dev: DevState, year: RegionSet | null): year is AuthoredSet {
  return dev.political.exactFills && year?.authored !== undefined
}

/** A year read from the Cartographer's files: its authored year is there. */
export type AuthoredSet = RegionSet & { authored: NonNullable<RegionSet['authored']> }

/**
 * Whether the year on screen is painted as geometry rather than through the texture. The one place both the bake and
 * the layers ask, so the texture never drops a tint the geometry does not then draw.
 * @param dev - the live tunables
 * @param sources - what has been loaded
 * @returns `true` when the fills carry the colour
 */
export function paintsExactFills(dev: DevState, sources: MapSources): boolean {
  return yearPaintsExactFills(dev, sources.regionSet)
}
