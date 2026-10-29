/**
 * The gentle arc a name is first tried on (ATLAS-301): through the middle of its space, along the space's length,
 * bent with its spine — the line the dev's two reference maps write every name on (a Crusader Kings III map, a map of
 * 1501: LITHUANIA, CRIMEAN KHANATE, OTTOMAN EMPIRE), 2026-10-28.
 *
 * **The space's length** is its main axis, by the spread of all its cells. **Its spine** is the middle of each slice
 * across that axis; a parabola fitted to those middles, bent {@link MAX_BEND} at most, is the arc. **Cut evenly about
 * the point nearest the space's centre of mass**, so a name centred on it is centred on the country.
 */

import { readAt } from '../utils/math'

import { fitParabola, limitedBend, readingFrame, sampled } from './nameLine'

import type { NameLine } from './nameLine'

/**
 * The cells of a space, as points.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param width - the crop's width
 * @returns each inside cell's `[x, y]`
 */
function cellsOf(mask: Uint8Array, width: number): (readonly [number, number])[] {
  const cells: (readonly [number, number])[] = []
  mask.forEach((inside, at) => {
    if (inside !== 0) cells.push([at % width, Math.floor(at / width)])
  })
  return cells
}

/**
 * The least and the greatest of many numbers — by a loop: spreading tens of thousands of cells into `Math.min` can
 * overflow the call stack.
 * @param values - the numbers
 * @returns `[least, greatest]`
 */
function span(values: readonly number[]): [number, number] {
  let low = Infinity
  let high = -Infinity
  for (const value of values) {
    low = Math.min(low, value)
    high = Math.max(high, value)
  }
  return [low, high]
}

/**
 * The middle of each slice of the space across its axis.
 * @param projected - every cell as `[s, t]`: along the axis, and across it
 * @returns one `[s, t]` per slice, `t` the mean across
 */
function spine(projected: readonly (readonly [number, number])[]): (readonly [number, number])[] {
  const slices = new Map<number, { sum: number; count: number }>()
  for (const [s, t] of projected) {
    const key = Math.round(s)
    const slice = slices.get(key) ?? { sum: 0, count: 0 }
    slice.sum += t
    slice.count += 1
    slices.set(key, slice)
  }
  return [...slices].map(([s, { sum, count }]): readonly [number, number] => [s, sum / count])
}

/**
 * A line cut evenly about the point of it nearest a place, so the middle of what is left is that point.
 * @param line - the line
 * @param x - the place's column
 * @param y - its row
 * @returns the cut line
 */
export function centredOn(line: NameLine, x: number, y: number): NameLine {
  let nearest = 0
  line.points.forEach(([px, py], at) => {
    const best = line.points[nearest] ?? [Number.NaN, Number.NaN]
    if (Math.hypot(px - x, py - y) < Math.hypot(best[0] - x, best[1] - y)) nearest = at
  })
  const total = readAt(line.lengths, line.lengths.length - 1)
  const middle = readAt(line.lengths, nearest)
  const reach = Math.min(middle, total - middle)
  const kept = line.points
    .map((point, at) => ({ point, walked: readAt(line.lengths, at) }))
    .filter(({ walked }) => walked >= middle - reach - 1e-9 && walked <= middle + reach + 1e-9)
  const start = kept[0]?.walked ?? 0
  return {
    points: kept.map(({ point }) => point),
    lengths: kept.map(({ walked }) => walked - start),
  }
}

/**
 * The gentle arc through the middle of a space, along its length.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param width - the crop's width
 * @returns the arc, read left to right — or upward when steep — and centred on the space's centre of mass; `null`
 *   for a space too small to give one
 */
export function axisArc(mask: Uint8Array, width: number): NameLine | null {
  const cells = cellsOf(mask, width)
  if (cells.length < 2) return null
  const { origin, along, up } = readingFrame(cells)
  const projected = cells.map(([x, y]): readonly [number, number] => {
    const dx = x - origin[0]
    const dy = y - origin[1]
    return [dx * along[0] + dy * along[1], dx * up[0] + dy * up[1]]
  })
  const [low, high] = span(projected.map(([s]) => s))
  const from = low - 0.5
  const to = high + 0.5
  const [bend, b, k] = fitParabola(spine(projected))
  const a = limitedBend(bend, b, from, to)
  const arc = sampled(
    (s) => {
      const t = a * s * s + b * s + k
      return [origin[0] + s * along[0] + t * up[0], origin[1] + s * along[1] + t * up[1]]
    },
    from,
    to
  )
  const centred = centredOn(arc, origin[0], origin[1])
  return centred.points.length < 2 ? null : centred
}

/**
 * How long a space is along its main axis, in cells — what a name's coverage is measured against.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param width - the crop's width
 * @returns its extent along the axis
 */
export function spaceLength(mask: Uint8Array, width: number): number {
  const cells = cellsOf(mask, width)
  if (cells.length === 0) return 0
  const { origin, along } = readingFrame(cells)
  const [low, high] = span(
    cells.map(([x, y]) => (x - origin[0]) * along[0] + (y - origin[1]) * along[1])
  )
  return high - low + 1
}

/** A space's shape as a name's candidates are judged against it. */
export interface SpaceShape {
  /** Its centre of mass, in the crop's cells — inside the space or not. */
  readonly centre: readonly [number, number]
  /** Its length along its main axis, in cells. */
  readonly length: number
  /** The radius of a disc of its area, in cells: how far is far from its centre. */
  readonly reach: number
}

/**
 * A space's centre, length and reach.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param width - the crop's width
 * @returns its shape
 */
export function spaceShape(mask: Uint8Array, width: number): SpaceShape {
  const cells = cellsOf(mask, width)
  const { origin } = readingFrame(cells.length > 0 ? cells : [[0, 0]])
  return {
    centre: origin,
    length: spaceLength(mask, width),
    reach: Math.sqrt(cells.length / Math.PI),
  }
}
