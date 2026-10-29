/**
 * The offset label (ATLAS-315, the dev, 2026-10-29: *« terminer le sujet »*): the name of a realm too small to hold it,
 * written **beside** it, on the sea — the cartographers' way with small areas (`files/plans/glossaire.md`, « étiquette
 * déportée »). Naples, Amalfi, Ragusa, Genoa, Dublin and the Roussillon were named nowhere in 1100.
 *
 * **One rule, no score**: the name is written straight, unspaced, at the largest size from `startSize` down that fits,
 * centred on the open cell nearest the realm where it fits — the sea or ground nobody claims, never a neighbour nor a
 * name already written (`nameFit.fits`, the bite as everywhere) — and **beside** it: its middle no further from the
 * realm's land than {@link OFFSET_REACH} letter heights, or it would read as another's. A realm with no open ground
 * that near — an enclave — gets none: its name waits for a leader line, the ticket's second step.
 */

import { distanceToOutside } from '../geo/distanceTransform'
import { readAt } from '../utils/math'

import { fits, roomAcross } from './nameFit'
import { sampled } from './nameLine'

import type { ConstructedName, Construction } from './nameConstruction'
import type { Fitting } from './nameFit'

/** How much smaller the name is tried each time it fits nowhere — the construction's own step. */
const SHRINK = 0.92

/** How far from the realm's land the middle of its name may lie, in letter heights at the size tried. */
export const OFFSET_REACH = 2

/** How much longer than the name its line is drawn, in cells. */
const LINE_SLACK = 0.01

/** Never read through a coast: the letters are bounded by the neighbours and the names only, as in the construction. */
const SEA_OPEN = -Infinity

/** An open cell around a realm, and how far it lies from the realm's land. */
interface OpenCell {
  /** Its index in the crop. */
  readonly at: number
  /** Its distance to the realm's nearest cell, in cells. */
  readonly away: number
}

/**
 * The open cells around a realm, nearest first: neither its own, a neighbour's, nor under a name already written.
 * @param fitting - the realm, in a crop wide enough to hold a name beside it
 * @returns the cells, by their distance to the realm's land
 */
function openCellsByDistance(fitting: Fitting): OpenCell[] {
  const { mask, blocked, width, height } = fitting.space
  const outside = mask.map((inside) => (inside === 0 ? 1 : 0))
  const away = distanceToOutside(outside, width, height)
  const open: OpenCell[] = []
  mask.forEach((inside, at) => {
    if (inside === 0 && readAt(blocked, at) === 0) open.push({ at, away: readAt(away, at) })
  })
  return open.sort((a, b) => a.away - b.away)
}

/**
 * Write a name beside its realm, on the open ground nearest it.
 * @param fitting - the realm, in a crop widened to hold the name beside it (`nameSpace.widenedSpace`), its neighbours
 *   and the names already written marked
 * @param name - the name's measure, at a size of one
 * @param options - the smallest size, and the size the search starts from
 * @param options.minSize - the smallest size written, in cells
 * @param options.startSize - the largest size tried, in cells
 * @returns the straight line, the size and no spacing; `null` when the name fits beside the realm at no size
 */
export function offsetName(
  fitting: Fitting,
  name: ConstructedName,
  options: { readonly minSize: number; readonly startSize: number }
): Construction | null {
  const { width } = fitting.space
  const cells = openCellsByDistance(fitting)
  // An enclave has nothing open beside it: no sea, no unclaimed ground.
  if (cells.length === 0) return null
  for (let size = options.startSize; size >= options.minSize; size *= SHRINK) {
    // A hair longer than the name, so the line's summed steps never fall short of it by a rounding.
    const half = (name.length * size) / 2 + LINE_SLACK
    const reach = OFFSET_REACH * name.height * size
    for (const { at, away } of cells) {
      if (away > reach) break
      const [x, y] = [at % width, Math.floor(at / width)]
      const line = sampled((s) => [s, y], x - half, x + half)
      const room = roomAcross(fitting, line, SEA_OPEN, (name.height * size) / 2 + 1)
      if (fits(fitting, line, room, name, size, SEA_OPEN)) return { line, size, tracking: 0 }
    }
  }
  return null
}
