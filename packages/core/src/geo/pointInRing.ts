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

/** A polity's rings prepared for many point tests: its box, and its edges sorted into latitude bands. */
export interface RingIndex {
  /** The box around every ring — a point outside it is outside. */
  box: { west: number; east: number; south: number; north: number }
  /** The southern edge of band 0, in degrees. */
  south: number
  /** The height of one band, in degrees; `0` for rings with no height. */
  bandHeight: number
  /** For each band, the edges whose latitude span reaches into it, as `[xi, yi, xj, yj]`. */
  bands: (readonly [number, number, number, number])[][]
}

/** About how many edges a band holds — the price of a test, against the memory of the index. */
const EDGES_PER_BAND = 8

/**
 * Prepare a polity's rings for many point tests (CARTO-240): `pointInIndexedRings` then gives the answer
 * `pointInRings` gives, looking only at the edges of the point's latitude band instead of every vertex.
 *
 * **Why it gives the same answer.** Even-odd across several rings is the parity of *all* the edges a
 * horizontal ray crosses, whatever ring each belongs to. An edge can be crossed by the ray at latitude `y`
 * only if its span contains `y` — the `(yi > y) !== (yj > y)` test — so every edge that can count is filed
 * in that band, and the crossing test itself is the very same arithmetic. Measured on the dev's 1100,
 * 2026-10-17: Norway's 16 235 vertices made one test walk all of them, and a gesture cost seconds.
 * @param rings - every ring the polity holds, outer and hole alike
 * @returns the index
 */
export function indexRings(rings: readonly (readonly [number, number][])[]): RingIndex {
  const box = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity }
  const edges: (readonly [number, number, number, number])[] = []
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const vi = ring[i]
      const vj = ring[j]
      if (vi === undefined || vj === undefined) continue
      box.west = Math.min(box.west, vi[0])
      box.east = Math.max(box.east, vi[0])
      box.south = Math.min(box.south, vi[1])
      box.north = Math.max(box.north, vi[1])
      // A horizontal edge is never crossed by a horizontal ray: it can be left out.
      if (vi[1] !== vj[1]) edges.push([vi[0], vi[1], vj[0], vj[1]])
    }
  }
  const height = box.north - box.south
  const count = Math.max(1, Math.ceil(edges.length / EDGES_PER_BAND))
  const bandHeight = height > 0 ? height / count : 0
  const bands: (readonly [number, number, number, number])[][] = Array.from(
    { length: count },
    () => []
  )
  const bandOf = (lat: number): number =>
    bandHeight === 0
      ? 0
      : Math.min(count - 1, Math.max(0, Math.floor((lat - box.south) / bandHeight)))
  for (const edge of edges) {
    const low = bandOf(Math.min(edge[1], edge[3]))
    const high = bandOf(Math.max(edge[1], edge[3]))
    for (let band = low; band <= high; band += 1) bands[band]?.push(edge)
  }
  return { box, south: box.south, bandHeight, bands }
}

/**
 * Whether a point is inside a polity, through its index — the same answer as `pointInRings`.
 * @param point - the `[longitude, latitude]` pair to test
 * @param index - the polity's rings, indexed by `indexRings`
 * @returns `true` when the point is held
 */
export function pointInIndexedRings(point: readonly [number, number], index: RingIndex): boolean {
  const [x, y] = point
  const { box } = index
  if (x < box.west || x > box.east || y < box.south || y > box.north) return false
  const band =
    index.bandHeight === 0
      ? 0
      : Math.min(index.bands.length - 1, Math.floor((y - index.south) / index.bandHeight))
  let inside = false
  for (const [xi, yi, xj, yj] of index.bands[band] ?? []) {
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
