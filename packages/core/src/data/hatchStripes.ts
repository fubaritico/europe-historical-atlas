/**
 * The hatching's stripes (ATLAS-399): how wide they are on the ground, and how many colours take turns.
 *
 * **Baked on the ground, never resized with the zoom** — the dev, 2026-11-09: _"no fixed width, it vibrates when you
 * zoom, because it resizes"_. A stripe is a width in kilometres, so it grows with the zoom as the relief does; wide
 * enough to read from afar. **One constant, no dev-panel setting** (the dev, 2026-11-09).
 */

import { EARTH_RADIUS_KM } from '../geo/signedDistance'

import type { GeoBounds } from '../geo/mercator'

/** Degrees to radians. */
const DEG2RAD = Math.PI / 180

/** One stripe's width on the ground, km, measured across the map's west–east axis. Tuned on sight. */
export const HATCH_STRIPE_KM = 25

/**
 * How many polities' colours a hatch takes in turn — the dev, 2026-11-06: four polities over one ground, four colours
 * (_"it will never happen, but it must be computed that way"_). A fifth and beyond is not striped.
 *
 * **Structural, not a setting** (review ARCH-004): a stripe image holds one colour per RGBA channel, and the atlas's
 * hatch shader takes exactly four colour attributes and three images (two, three, four colours). Raising it means a
 * second image per count and a shader rewritten with it.
 */
export const HATCH_MAX_COLOURS = 4

/**
 * One stripe's width in world units, across the map plane, at the frame's middle latitude — the plane is Mercator, so a
 * world unit is a few kilometres more at the south edge than at the north; one width for the whole map keeps every
 * stripe parallel and evenly spaced.
 * @param bbox - the frame the plane spans
 * @param worldWidth - the plane's width on X
 * @returns the width of one stripe, in world units
 */
export function hatchStripeWorld(bbox: GeoBounds, worldWidth: number): number {
  const middle = ((bbox.north + bbox.south) / 2) * DEG2RAD
  const kmAcross = EARTH_RADIUS_KM * Math.cos(middle) * (bbox.east - bbox.west) * DEG2RAD
  return (HATCH_STRIPE_KM / kmAcross) * worldWidth
}
