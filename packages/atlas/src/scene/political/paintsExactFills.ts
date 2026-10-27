/**
 * Who carries a year's colour: the fill geometry, or the baked texture — asked by the bake, the fills and every frame.
 */

import type { MapSources } from '../../sources/mapSources'
import type { DevState } from '../../tunables/devState'

/**
 * Whether the year on screen is painted as geometry rather than through the texture: an authored year,
 * with the panel's switch on. The one place both the bake and the layers ask, so the texture never drops
 * a tint the geometry does not then draw.
 * @param dev - the live tunables
 * @param sources - what has been loaded
 * @returns `true` when the fills carry the colour
 */
export function paintsExactFills(dev: DevState, sources: MapSources): boolean {
  return dev.political.exactFills && sources.regionSet?.authored !== undefined
}
