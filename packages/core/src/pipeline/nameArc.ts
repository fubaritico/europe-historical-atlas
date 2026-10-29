/**
 * The gentle arc a name is written along (ATLAS-301): through the middle of its space, along the space's length,
 * bent with its spine — the line the dev's two reference maps write every name on (a Crusader Kings III map, a map of
 * 1501: LITHUANIA, CRIMEAN KHANATE, OTTOMAN EMPIRE), 2026-10-28.
 *
 * **The space's length** is its main axis, by the spread of all its cells. **Its spine** is the middle of each slice
 * across that axis; a parabola fitted to those middles, bent {@link MAX_BEND} at most, is the arc. **Cut evenly about
 * the point nearest the space's centre of mass**, so a name centred on it is centred on the country. A compact space
 * — {@link spaceAspect} under `nameConstruction`'s bound — has its axis and its spine's lean held to a slant
 * (`steepest`), so its name is a diagonal and never stands.
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
 * @param steepest - the most the arc may slant from the horizontal, in radians: its axis (`readingFrame`) and the lean of
 *   the spine fitted from it, so a compact space's name stays a diagonal; a right angle leaves both as they are
 * @returns the arc, read left to right — or upward when steep — and centred on the space's centre of mass; `null`
 *   for a space too small to give one
 */
export function axisArc(mask: Uint8Array, width: number, steepest = Math.PI / 2): NameLine | null {
  const cells = cellsOf(mask, width)
  if (cells.length < 2) return null
  const { origin, along, up } = readingFrame(cells, steepest)
  const projected = cells.map(([x, y]): readonly [number, number] => {
    const dx = x - origin[0]
    const dy = y - origin[1]
    return [dx * along[0] + dy * along[1], dx * up[0] + dy * up[1]]
  })
  const [low, high] = span(projected.map(([s]) => s))
  const from = low - 0.5
  const to = high + 0.5
  const [bend, lean, k] = fitParabola(spine(projected))
  // The spine's lean turns the arc from its axis by `-atan(lean)`: held so the whole stays within `steepest`.
  const axis = Math.atan2(along[1], along[0])
  const b =
    steepest < Math.PI / 2
      ? Math.tan(Math.min(axis + steepest, Math.max(axis - steepest, Math.atan(lean))))
      : lean
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
 * How long a space is for its width: the spread of its cells along its main axis over the spread across it.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param width - the crop's width
 * @returns `1` for a round or square space, more the longer it is; `1` for a space of fewer than two cells
 */
export function spaceAspect(mask: Uint8Array, width: number): number {
  const cells = cellsOf(mask, width)
  if (cells.length < 2) return 1
  const { origin, along, up } = readingFrame(cells)
  let alongSpread = 0
  let acrossSpread = 0
  for (const [x, y] of cells) {
    const dx = x - origin[0]
    const dy = y - origin[1]
    alongSpread += (dx * along[0] + dy * along[1]) ** 2
    acrossSpread += (dx * up[0] + dy * up[1]) ** 2
  }
  return acrossSpread > 0 ? Math.sqrt(alongSpread / acrossSpread) : Infinity
}
