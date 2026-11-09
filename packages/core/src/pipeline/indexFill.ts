/**
 * A polity's fill with its vertices shared (ATLAS-333): `fillTriangles` hands back three vertices a triangle, and a
 * relief cell's two triangles and its neighbours' meet on the same grid nodes — 2.6 million vertices for 1100's
 * countries, 518,000 of them distinct (measured 2026-11-08). Shared, a year's fills weigh half on the page and on the
 * GPU, and the page reads the relief under a fifth as many vertices.
 *
 * **Two vertices are one when they round to the same point of a 2⁻²⁴ grid** — the step of a 32-bit float between ½
 * and 1, finer below: the corners the cut computes for neighbouring triangles are the same numbers, and two points
 * closer than that (a 25th of a metre across the map) are one on screen.
 *
 * **The key is exact for `u` and `v` in [−1, 2)** — the cut keeps them in [0, 1], each vertex clipped inside a relief
 * cell; the margin only spares an arithmetic overshoot from meeting another point's key.
 */

/** A fill with its vertices shared: each distinct `u, v` once, and three indices a triangle. */
export interface IndexedFill {
  /** Each distinct vertex's `u, v`, flat. */
  readonly vertices: Float32Array
  /** Three indices into `vertices` per triangle, in the order the triangles came. */
  readonly indices: Uint32Array
  /**
   * Each vertex's signed distance to its polity's outline, km, negative inside — a vassal's alone, for its band
   * (`vassalBands`, ATLAS-398). **Absent for a polity that wears no band**, which is what it means, not a value missing.
   */
  readonly bandKm?: Float32Array
}

/** Steps of the grid two vertices are matched on, per unit of `u` and of `v`. */
const STEPS = 2 ** 24

/** Steps a key gives each axis: [−1, 2) is three units — under 2²⁶, so a key stays under 2⁵² and exact. */
const SPAN = 2 ** 26

/**
 * Share the vertices of a fill.
 * @param triangles - a polity's triangles, flat `u, v`, three vertices a triangle — `fillTriangles`' output
 * @returns each distinct vertex once, and the triangles as indices into them
 */
export function indexFill(triangles: Float32Array): IndexedFill {
  const count = Math.floor(triangles.length / 2)
  const indexOf = new Map<number, number>()
  const vertices = new Float32Array(triangles.length)
  const indices = new Uint32Array(count)
  let distinct = 0
  for (let i = 0; i < count; i++) {
    // Indices the loop keeps in range (`noUncheckedIndexedAccess`): the `NaN` never stands in for anything.
    const u = triangles[2 * i] ?? Number.NaN
    const v = triangles[2 * i + 1] ?? Number.NaN
    // One integer a point, each axis shifted by a unit so that [−1, 2) falls in [0, SPAN).
    const key = (Math.round(u * STEPS) + STEPS) * SPAN + Math.round(v * STEPS) + STEPS
    let index = indexOf.get(key)
    if (index === undefined) {
      index = distinct
      indexOf.set(key, index)
      vertices[2 * distinct] = u
      vertices[2 * distinct + 1] = v
      distinct += 1
    }
    indices[i] = index
  }
  return { vertices: vertices.slice(0, 2 * distinct), indices }
}
