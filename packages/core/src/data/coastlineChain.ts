import type { CoastlineSegment, UvPoint } from './coastlineSource'

/**
 * Chaining loose coastline segments into contours.
 *
 * **Marching squares emits a cloud, not a shoreline.** `createFieldCoastlineSource` walks the grid cell
 * by cell and pushes one independent segment per crossing, in no particular order. That is enough to
 * *draw* a coast as a pile of strokes, which is what the atlas does — it hands them to a line layer that
 * does not care. It is not enough for anything that has to talk about *a* coast.
 *
 * **Two things need the contour, and only one of them is performance.**
 *
 * The first is the gesture `s02` specifies: *"I click near the mouth of the Somme… I click near the tip
 * of Brittany… the whole coastline sub-path between the two is inserted"*. A sub-path between two points
 * has no meaning in a cloud of 95 212 unordered segments — there is no "between".
 *
 * The second is that a 2D canvas pays per sub-path. Measured on the shipped mask at the atlas's own
 * tracing resolution (2 560 px): **95 212 segments**, so 95 212 `moveTo`/`lineTo` pairs on every repaint,
 * and the Cartographer repaints on every `pointermove` of a pan. Chained, the same shoreline is a few
 * hundred strokes.
 *
 * **The endpoints coincide exactly, and that is a property of the producer rather than luck.** Two
 * neighbouring cells compute their shared edge from the same two corner values through the same
 * expression: cell `(x, y)`'s right crossing is `crossing(tr, br, level)`, and cell `(x+1, y)`'s left
 * crossing is `crossing(tl', bl', level)` where `tl' = tr` and `bl' = br`. Same function, same arguments,
 * same bits. So the join is an exact key lookup with **no epsilon** — the same guarantee
 * `extractRegionBorders` gets from its doubled-integer lattice, reached here by determinism instead.
 * An epsilon would be worse than useless: it would silently weld two shores that pass close by.
 */

/** A chained run of coastline, in normalized grid coordinates. */
export interface Contour {
  /** The points in order. A closed contour does **not** repeat its first point at the end. */
  points: UvPoint[]
  /** Whether the run comes back to where it started — an island, a lake, or the frame's own loop. */
  closed: boolean
}

/**
 * The lookup key for a point.
 *
 * A string of the two coordinates, which is exact here because the producer is deterministic (see the
 * module header). `Number.prototype.toString` round-trips a double exactly, so no precision is lost in
 * the key itself.
 * @param point - the point to key
 * @returns the key
 */
function keyOf(point: UvPoint): string {
  return `${String(point.u)},${String(point.v)}`
}

/** One endpoint's view of the segments that touch it. */
type Incidence = Map<string, number[]>

/**
 * Index every segment by both of its endpoints.
 * @param segments - the loose segments
 * @returns which segment indices touch each point key
 */
function indexEndpoints(segments: readonly CoastlineSegment[]): Incidence {
  const incidence: Incidence = new Map()
  segments.forEach((segment, index) => {
    for (const end of segment) {
      const key = keyOf(end)
      const touching = incidence.get(key)
      if (touching) touching.push(index)
      else incidence.set(key, [index])
    }
  })
  return incidence
}

/**
 * The next unused segment leaving a point, if there is one.
 * @param incidence - the endpoint index
 * @param key - the point to leave from
 * @param used - which segments have already been walked
 * @returns the segment index, or `undefined` when the run ends here
 */
function nextFrom(incidence: Incidence, key: string, used: boolean[]): number | undefined {
  const touching = incidence.get(key)
  if (!touching) return undefined
  return touching.find((index) => used[index] !== true)
}

/**
 * Walk one run from a starting segment, in one direction.
 *
 * Appends to `points` without repeating the junction, and reports where it stopped.
 * @param segments - the loose segments
 * @param incidence - the endpoint index
 * @param used - which segments have already been walked; updated as it goes
 * @param from - the segment to start on
 * @param at - which end of that segment to leave from (0 or 1)
 * @param points - the run being built, appended to
 * @returns the key of the point the walk ended on
 */
function walk(
  segments: readonly CoastlineSegment[],
  incidence: Incidence,
  used: boolean[],
  from: number,
  at: 0 | 1,
  points: UvPoint[]
): string {
  let index: number | undefined = from
  let entry = at
  let key = ''
  while (index !== undefined) {
    used[index] = true
    const segment = segments[index]
    if (!segment) break
    const exit = segment[entry === 0 ? 1 : 0]
    points.push(exit)
    key = keyOf(exit)
    index = nextFrom(incidence, key, used)
    if (index !== undefined) {
      const next = segments[index]
      // Which end of the next segment we are arriving at decides which end we will leave from.
      entry = next && keyOf(next[0]) === key ? 0 : 1
    }
  }
  return key
}

/**
 * Chain loose segments into contours.
 *
 * **Each run is walked in both directions from its seed**, because the seed is picked arbitrarily and may
 * sit in the middle of an open run — the frame's edge cuts the shoreline, so open runs are the normal
 * case, not the exception. Walking forwards only would cut every such coast in two at a random point.
 *
 * A run that comes back to its own start is reported `closed`, and its first point is **not** repeated at
 * the end: a consumer that needs the repeat (a `fill`, a ring in the document format) adds it, and one
 * that does not (a `stroke` with `closePath`) is not made to strip it.
 * @param segments - the loose segments, in any order
 * @returns the contours, longest first, so a caller that draws or culls meets the coastline before the ponds
 */
export function chainSegments(segments: readonly CoastlineSegment[]): Contour[] {
  const incidence = indexEndpoints(segments)
  const used: boolean[] = new Array<boolean>(segments.length).fill(false)
  const contours: Contour[] = []

  for (let seed = 0; seed < segments.length; seed++) {
    if (used[seed] === true) continue
    const segment = segments[seed]
    if (!segment) continue

    const forward: UvPoint[] = []
    const endKey = walk(segments, incidence, used, seed, 0, forward)
    const startKey = keyOf(segment[0])
    const closed = endKey === startKey
    // A closed walk ends on the point it began at, so the run holds it twice. Dropped here rather than
    // left to every consumer to notice: a repeated point is a zero-length segment to a stroke, and a
    // duplicate anchor to the document format.
    if (closed) forward.pop()

    const backward: UvPoint[] = []
    // Only if the run did not already close on itself: a closed loop has no free end to extend from,
    // and walking again would simply find nothing.
    if (!closed) {
      const reopened = nextFrom(incidence, startKey, used)
      if (reopened !== undefined) {
        const next = segments[reopened]
        const entry = next && keyOf(next[0]) === startKey ? 0 : 1
        walk(segments, incidence, used, reopened, entry, backward)
      }
    }

    backward.reverse()
    contours.push({ points: [...backward, segment[0], ...forward], closed })
  }

  return contours.sort((a, b) => b.points.length - a.points.length)
}
