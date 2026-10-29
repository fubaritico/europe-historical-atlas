/**
 * The offset label (ATLAS-315, the dev, 2026-10-29: *« terminer le sujet »*): the name of a realm too small to hold it,
 * written **beside** it, on the sea — the cartographers' way with small areas (`files/plans/glossaire.md`, « étiquette
 * déportée »). Naples, Amalfi, Ragusa, Genoa, Dublin and the Roussillon were named nowhere in 1100.
 *
 * **One rule, no score**: the name is written straight, unspaced, at the largest size from `startSize` down that fits,
 * centred on the open cell nearest the realm where it fits — the sea or ground nobody claims, never a neighbour nor a
 * name already written (`nameFit.fits`, the bite as everywhere) — and **beside** it: its middle no further from the
 * realm's land than {@link OFFSET_REACH} letter heights, or it would read as another's. A realm with no open ground
 * that near — an enclave — gets none there.
 *
 * **An enclave's name is written over a neighbour's land** — the caller opens the neighbours' cells and keeps the map's
 * frame closed (`namePlacement`) — by the same rule, never over a name already written, and a **leader** of dots ties
 * it to its realm (`leaderDots`), or it would read as the neighbour's own. Dots, as old maps draw a leader, so the line is letters of the names' own ink: no new material on the atlas.
 */

import { distanceToOutside } from '../geo/distanceTransform'
import { readAt } from '../utils/math'

import { fits, roomAcross } from './nameFit'
import { sampled } from './nameLine'

import type { ConstructedName, Construction } from './nameConstruction'
import type { Fitting } from './nameFit'
import type { NameLine } from './nameLine'

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
 * @returns the straight line, the size and no spacing; `null` when the name fits beside the realm at no size, or
 *   the smallest size is above the start
 */
export function offsetName(
  fitting: Fitting,
  name: ConstructedName,
  options: { readonly minSize: number; readonly startSize: number }
): Construction | null {
  // An offset label is never larger than its own size: under a smallest size above it, there is none.
  if (options.startSize < options.minSize) return null
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

/** The character a leader is drawn with: the middle dot, the names' own ink and face. */
export const LEADER_DOT = '\u00b7'

/** How far apart a leader's dots are, in ems of the name's size. */
const DOT_STEP = 0.5

/** How far the middle dot sits above its baseline, in ems — where the eye reads the leader's line. */
const DOT_RISE = 0.3

/** The gap left between the name's box and the leader's first dot, in ems. */
const LEADER_GAP = 0.3

/**
 * The realm's cell nearest a point.
 * @param mask - the realm, row-major over the crop
 * @param width - the crop's width
 * @param point - the point, in the crop's cells
 * @returns the cell's centre, or `undefined` when the realm holds none
 */
function nearestCell(
  mask: Uint8Array,
  width: number,
  point: readonly [number, number]
): readonly [number, number] | undefined {
  let found: readonly [number, number] | undefined
  let nearest = Infinity
  for (let at = 0; at < mask.length; at += 1) {
    if (readAt(mask, at) === 0) continue
    const cell: readonly [number, number] = [at % width, Math.floor(at / width)]
    const away = Math.hypot(cell[0] - point[0], cell[1] - point[1])
    if (away < nearest) [found, nearest] = [cell, away]
  }
  return found
}

/**
 * The dots of a leader from a name to its realm: from the name's box, toward the realm's nearest cell, to that cell —
 * each the baseline a `LEADER_DOT` is drawn on as a letter is, under the line so the dot sits on it.
 * @param line - the name's straight line, in the crop's cells
 * @param name - the name's measure, at a size of one
 * @param size - its size, in cells
 * @param mask - the realm, row-major over the crop
 * @param width - the crop's width
 * @returns the dots' baselines, `[x, y]` in the crop's cells; none when the realm holds no cell
 */
export function leaderDots(
  line: NameLine,
  name: ConstructedName,
  size: number,
  mask: Uint8Array,
  width: number
): [number, number][] {
  const [first, last] = [line.points[0], line.points.at(-1)]
  if (first === undefined || last === undefined) return []
  const centre: readonly [number, number] = [(first[0] + last[0]) / 2, (first[1] + last[1]) / 2]
  const target = nearestCell(mask, width, centre)
  if (target === undefined) return []
  const [dx, dy] = [target[0] - centre[0], target[1] - centre[1]]
  const length = Math.hypot(dx, dy)
  // Out of the name's box — its half-length along, half its letters' height across — and a gap.
  const along = dx === 0 ? Infinity : (name.length * size) / 2 / Math.abs(dx)
  const across = dy === 0 ? Infinity : (name.height * size) / 2 / Math.abs(dy)
  const leave = Math.min(along, across) * length + LEADER_GAP * size
  const dots: [number, number][] = []
  for (let walked = leave; walked <= length; walked += DOT_STEP * size) {
    const t = walked / length
    dots.push([centre[0] + dx * t, centre[1] + dy * t + DOT_RISE * size])
  }
  return dots
}
