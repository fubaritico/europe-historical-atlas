import type { Point } from '../viewport/viewport'

/**
 * Which polity's territory is under the pointer — the white arrow's click in a fill (the dev's request,
 * 2026-10-11: *"en cliquant dans le plein d'une forme … on puisse la sélectionner"*).
 *
 * **Even-odd, ring by ring, over a polity's whole claim**: a ring inside another is a hole (`H-07`), so a
 * click in a hole is not in the polity. **The one painted last wins**, which is the one on top — a duchy
 * drawn inside its kingdom is what the pointer is over, not the kingdom under it.
 *
 * Screen pixels, on rings already projected: the painter projects them for every frame anyway.
 */

/** A polity's territory, as the painter holds it. */
export interface PolityRings {
  /** The polity's id. */
  polity: string
  /** Its rings, in screen pixels. */
  rings: readonly (readonly Point[])[]
}

/**
 * Whether a horizontal ray from a point crosses one edge — the even-odd step.
 * @param at - the point
 * @param a - one end of the edge
 * @param b - the other end
 * @returns `true` when the ray to the right of `at` crosses the edge
 */
function crosses(at: Point, a: Point, b: Point): boolean {
  if (a[1] > at[1] === b[1] > at[1]) return false
  const x = a[0] + ((at[1] - a[1]) / (b[1] - a[1])) * (b[0] - a[0])
  return at[0] < x
}

/**
 * Whether a point lies inside a set of rings, by the even-odd rule.
 * @param rings - the rings, each closed implicitly
 * @param at - the point
 * @returns `true` when the point is inside an odd number of them
 */
export function insideRings(rings: readonly (readonly Point[])[], at: Point): boolean {
  let inside = false
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index += 1) {
      const a = ring[index]
      const b = ring[(index + 1) % ring.length]
      if (a !== undefined && b !== undefined && crosses(at, a, b)) inside = !inside
    }
  }
  return inside
}

/**
 * The polity whose territory is under the pointer, the one painted last winning.
 * @param territories - every polity's rings, in painting order
 * @param at - the pointer, in screen pixels
 * @returns the polity's id, or `null` over unclaimed ground
 */
export function polityAt(territories: readonly PolityRings[], at: Point): string | null {
  for (let index = territories.length - 1; index >= 0; index -= 1) {
    const territory = territories[index]
    if (territory !== undefined && insideRings(territory.rings, at)) return territory.polity
  }
  return null
}

/** A ring prepared for many questions: its box, and its edges sorted into horizontal bands. */
interface BandedRing {
  /** The ring's lowest x. */
  readonly minX: number
  /** The ring's highest x. */
  readonly maxX: number
  /** The ring's lowest y. */
  readonly minY: number
  /** The ring's highest y. */
  readonly maxY: number
  /** How tall a band is — `0` for a ring with no height, which holds no point. */
  readonly bandHeight: number
  /** Each band's edges, as pairs of ends: an edge sits in every band its own height spans. */
  readonly bands: readonly (readonly (readonly [Point, Point])[])[]
}

/** How many edges a band holds on average: fewer bands than that would test more, more would only cost memory. */
const EDGES_PER_BAND = 8

/**
 * The band a height falls in.
 * @param y - the height
 * @param ring - the ring's lowest y and its bands' height and count
 * @param ring.minY - the ring's lowest y
 * @param ring.bandHeight - how tall a band is
 * @param count - how many bands the ring has
 * @returns the band's index, kept inside the ring's bands
 */
function bandOf(y: number, ring: Pick<BandedRing, 'minY' | 'bandHeight'>, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor((y - ring.minY) / ring.bandHeight)))
}

/**
 * Prepare a ring: measure its box and sort its edges into bands, so a question reads only the edges at its height.
 * @param ring - the ring
 * @returns the ring prepared
 */
function bandedRing(ring: readonly Point[]): BandedRing {
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity]
  for (const [x, y] of ring) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const count = Math.max(1, Math.ceil(ring.length / EDGES_PER_BAND))
  const bandHeight = (maxY - minY) / count
  const bands: (readonly [Point, Point])[][] = Array.from({ length: count }, () => [])
  // A ring with no height holds no point: its bands stay empty, and its box refuses every question but on its line,
  // where no edge crosses.
  if (bandHeight > 0) {
    const frame = { minY, bandHeight }
    for (let index = 0; index < ring.length; index += 1) {
      const a = ring[index]
      const b = ring[(index + 1) % ring.length]
      if (a === undefined || b === undefined) continue
      const first = bandOf(Math.min(a[1], b[1]), frame, count)
      const last = bandOf(Math.max(a[1], b[1]), frame, count)
      const edge = [a, b] as const
      for (let band = first; band <= last; band += 1) bands[band]?.push(edge)
    }
  }
  return { minX, maxX, minY, maxY, bandHeight, bands }
}

/**
 * Whether a point's ray crosses a prepared ring an odd number of times — {@link insideRings}' step for one ring, read
 * from the ring's box and the one band at the point's height. A point outside the box crosses a closed ring an even
 * number of times, so it is answered without reading an edge.
 * @param ring - the ring prepared
 * @param at - the point
 * @returns `true` when the ring flips the point's side
 */
function flips(ring: BandedRing, at: Point): boolean {
  if (at[0] < ring.minX || at[0] > ring.maxX || at[1] < ring.minY || at[1] > ring.maxY) return false
  if (ring.bandHeight <= 0) return false
  let odd = false
  for (const [a, b] of ring.bands[bandOf(at[1], ring, ring.bands.length)] ?? []) {
    if (crosses(at, a, b)) odd = !odd
  }
  return odd
}

/**
 * {@link polityAt} for many points over the same territories (CARTO-485): each ring is prepared once — its box, its
 * edges in bands — so a point reads a handful of edges instead of every edge of every polity. The cities' verdicts ask
 * it for each city of a year: thirteen thousand points over a hundred and fifty polities was 250 million edge tests.
 * **The same answer as {@link polityAt}, point for point**: the same even-odd step, on the edges that can cross.
 * @param territories - every polity's rings, in painting order
 * @returns the question: the id of the polity under a point, the one painted last winning, or `null` over unclaimed
 *   ground
 */
export function polityLocator(territories: readonly PolityRings[]): (at: Point) => string | null {
  const prepared = territories.map(({ polity, rings }) => ({
    polity,
    rings: rings.map((ring) => bandedRing(ring)),
  }))
  return (at) => {
    for (let index = prepared.length - 1; index >= 0; index -= 1) {
      const territory = prepared[index]
      if (territory === undefined) continue
      let inside = false
      for (const ring of territory.rings) if (flips(ring, at)) inside = !inside
      if (inside) return territory.polity
    }
    return null
  }
}
