/**
 * Whether a point falls inside a closed ring, and inside a polity made of several.
 *
 * Ray casting with the even-odd rule, which is the same contract the raster already fills by
 * (`data/regionRaster` walks it row by row): a ring inside a ring is a hole, without anyone declaring it.
 * Doing it for one point rather than a whole grid is what the editor needs — "who holds the ground on the
 * far side of this line" is a single question asked thousands of times, not a raster.
 */

/**
 * Whether a point is inside one closed ring.
 *
 * Closure is implied: the last vertex is joined back to the first, the way the Cartographer's rings are
 * stored. A vertex repeated at the end is harmless — it contributes a zero-length edge, which no ray
 * crosses.
 *
 * **The `(yi > y) !== (yj > y)` test is what keeps a vertex exactly on the ray from being counted twice.**
 * Written the long way rather than with `<=` on both sides, because the symmetric form double-counts a
 * vertex the ray passes through and flips the answer for a whole column of queries.
 * @param point - the `[longitude, latitude]` pair to test
 * @param ring - the ring's vertices, closure implied
 * @returns `true` when the point is inside
 */
export function pointInRing(point: [number, number], ring: readonly [number, number][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const vi = ring[i]
    const vj = ring[j]
    if (vi === undefined || vj === undefined) continue
    const [xi, yi] = vi
    const [xj, yj] = vj
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Whether a point is inside a polity, which may be several rings.
 *
 * Even-odd across all of them together: two rings enclosing the same ground cancel, which is how a hole
 * works with nothing declaring it to be one. A polity's outer ring and an exclave are disjoint, so they
 * never cancel each other.
 * @param point - the `[longitude, latitude]` pair to test
 * @param rings - every ring the polity holds, outer and hole alike
 * @returns `true` when the point is held
 */
export function pointInRings(
  point: [number, number],
  rings: readonly (readonly [number, number][])[]
): boolean {
  let inside = false
  for (const ring of rings) if (pointInRing(point, ring)) inside = !inside
  return inside
}
