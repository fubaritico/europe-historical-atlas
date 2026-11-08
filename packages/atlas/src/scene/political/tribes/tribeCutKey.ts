/**
 * What the tribe patches were measured from (`mapTribeLayer`) — compared field by field before measuring again.
 * Everything `tribePatches` reads is in it: the tribes, every region whose ground cuts a spill, the frame, the grid and
 * the land (ARCH-003 / QUAL-007). A file of its own so the layers' context reads it without reading the builder.
 *
 * **The land by what it is made of, not by the mask object**: with the land mask failed, `maskOrFallback`
 * derives a new threshold mask at every call, so its identity never repeats — the land is the mask asset
 * when there is one, else the elevation and the sea level it is thresholded at.
 */

import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/** The key of a tribe cut. */
export interface TribeCutKey {
  /** The tribes' rings and colours, by identity — replaced, never mutated, when a year is settled. */
  tribes: object
  /** Every region of the year, by identity. */
  claims: object
  /** The frame the rings were projected against, by value. */
  bounds: GeoBounds
  /** The relief's subdivision. */
  segX: number
  /** The relief's subdivision. */
  segY: number
  /** The land mask asset, or `null` when it failed. */
  landMask: object | null
  /** The elevation the fallback is thresholded over, or `null` before it loads. */
  heightmap: object | null
  /** The fallback's threshold — read only when there is no mask. */
  seaLevel: number
  /** Whether the colour spills past the outline (`outset`): the patch's box and its neighbours' measure follow. */
  spill: boolean
}
