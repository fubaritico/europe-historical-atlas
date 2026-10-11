import type { Point } from '../view/viewport'

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
