/**
 * How long a space is along its main axis — the yardstick the names' tests and spikes judge a name's cover by: the
 * realm's own length, independent of the line the construction cuts, so a name that shrank onto a short stretch is seen
 * to cover little.
 */

import { readingFrame } from '../nameLine'

/**
 * How long a space is along its main axis, in cells.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param width - the crop's width
 * @returns its extent along the axis, a cell counted whole; `0` for an empty space
 */
export function spaceLength(mask: Uint8Array, width: number): number {
  const cells: (readonly [number, number])[] = []
  mask.forEach((inside, at) => {
    if (inside !== 0) cells.push([at % width, Math.floor(at / width)])
  })
  if (cells.length === 0) return 0
  const { origin, along } = readingFrame(cells)
  let [low, high] = [Infinity, -Infinity]
  for (const [x, y] of cells) {
    const s = (x - origin[0]) * along[0] + (y - origin[1]) * along[1]
    low = Math.min(low, s)
    high = Math.max(high, s)
  }
  return high - low + 1
}
