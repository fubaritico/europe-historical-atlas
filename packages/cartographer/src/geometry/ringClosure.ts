import { MIN_RING_ANCHORS } from '@europe-historical-atlas/core/editor/yearDocument'

import { distanceSquared, squaredRadius } from './hitTest'

import type { Point } from '../view/viewport'

/**
 * Whether the outline in progress can be closed, and whether the gesture is being offered.
 *
 * **Closing is by proximity to the first anchor, announced before the click** — H-04, settled
 * 2026-09-22 on the dev's own words: *"arrivé à une certaine proximité, on peut fermer un tracé."* `s02`
 * spells out what the reader sees: *"the pointer enters the snapping radius of the first anchor · that
 * anchor is emphasised and the cursor shows the closing mark · I click it · the ring closes"*. So the
 * offer has to be computable **before** the click, which is why this is a question and not an action.
 *
 * ‹enter› is the keyboard equivalent and closes on a straight segment from the last anchor to the first.
 * **Double-click is deliberately not used**: it is the atlas's fly-to gesture and the two would collide.
 *
 * The radius is the same screen-pixel constant as every other handle (`snapRadius / scale`), passed in
 * rather than declared — see `hitTest`'s header.
 */

/** The fewest anchors a ring can have — core's floor, so the Pen offers to close what the document accepts. */
export { MIN_RING_ANCHORS }

/**
 * Whether an outline holds enough anchors to be closed at all.
 *
 * What ‹enter› asks, and the first half of what proximity asks.
 * @param ring - the anchors placed so far, in order
 * @returns `true` once there are at least {@link MIN_RING_ANCHORS}
 */
export function canCloseRing(ring: readonly Point[]): boolean {
  return ring.length >= MIN_RING_ANCHORS
}

/**
 * Whether the closing gesture is being offered right now — the thing the cursor and the emphasis read.
 *
 * **It tests the *first* anchor, and that is the half the plausible version gets wrong.** Reaching for
 * "the anchor under the pointer" gives the *last* one on a dense outline, since the pointer is next to it
 * while drawing; the tool would then offer to close at every single click and close a two-point ring on
 * the second.
 * @param ring - the anchors placed so far, in order
 * @param at - where the pointer is, in screen pixels
 * @param radiusPx - how near the first anchor the pointer must be
 * @returns `true` when clicking would close the ring
 */
export function isClosingOffered(ring: readonly Point[], at: Point, radiusPx: number): boolean {
  const first = ring[0]
  if (first === undefined || !canCloseRing(ring)) return false
  return distanceSquared(first, at) <= squaredRadius(radiusPx)
}
