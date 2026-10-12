import type { UvPoint } from './coastlineSource'
import type { River } from './riverSource'

/**
 * Mending the rivers as Natural Earth ships them, so a river can be followed from end to end.
 *
 * **Measured before it was written** (`H-35`, 2026-10-12): the dataset cuts one river into several
 * polylines — the Loire in three laid end to end, the Rhône at the Arles fork — and strews 2-point
 * fragments beside the real course, one of which (the Meuse at Charleville-Mézières, 1.3 km from the main
 * course) caught a click and broke the following. The Pen follows one polyline at a time, so the dev's own
 * words were: *"ça n'a jamais marché d'une seule traite, à part de Dunkerque à Biarritz"* — the coast,
 * which was chained the same way long ago (`coastlineChain.ts`).
 *
 * **Two operations, and what neither does.** Fragments are dropped; pieces of one name meeting end to end
 * are joined. **A fork is never joined**: where a river splits in two (the Rhône at Arles), choosing an
 * arm would be inventing a course, so the pieces stay apart and the Pen follows each on its own. Nothing
 * is moved: a joined river is the concatenation of the points the dataset gave, minus the duplicated
 * meeting point.
 */

/**
 * How close two ends must be, in grid units (`u`, `v` in 0…1), to count as one meeting point.
 *
 * **Not zero, unlike the coastline**, and the reason is measured: the payload rounds to four decimals of
 * a degree, and the Loire's pieces meet at Decize 0.0001° apart (about 11 m) — the same point rounded two
 * ways. 2·10⁻⁶ of the grid is about 25 m on this backdrop: it joins those ends and nothing else measured —
 * the nearest ends that are genuinely different, the Rhône stub at Arles and the Meuse at Maastricht, lie
 * 160 m and 320 m apart.
 */
export const RIVER_JOIN_TOLERANCE = 2e-6

/** What mending did, so the caller can say it once. */
export interface MendedRivers {
  /** The rivers, fragments dropped and pieces joined. */
  rivers: River[]
  /** How many 2-point fragments were dropped. */
  dropped: number
  /** How many joins were made — pieces that became part of another. */
  joined: number
}

/**
 * Whether two points are the same meeting point.
 * @param a - one point
 * @param b - the other
 * @returns `true` within {@link RIVER_JOIN_TOLERANCE} on both axes
 */
function meets(a: UvPoint, b: UvPoint): boolean {
  return Math.abs(a.u - b.u) <= RIVER_JOIN_TOLERANCE && Math.abs(a.v - b.v) <= RIVER_JOIN_TOLERANCE
}

/**
 * Drop the 2-point fragments of a river that also has a real course.
 *
 * A 2-point polyline next to a longer one of the same name is not a stretch of river anyone would follow:
 * at Charleville-Mézières it is 500 m long and floats 1.3 km from the Meuse, and at Arles it duplicates the
 * fork. A river made **only** of 2-point pieces keeps them — they are all there is of it.
 * @param rivers - the centrelines of one name
 * @returns the pieces kept
 */
function withoutFragments(rivers: readonly River[]): River[] {
  if (!rivers.some((river) => river.points.length > 2)) return [...rivers]
  return rivers.filter((river) => river.points.length > 2)
}

/**
 * The one piece that continues `river` from its end, oriented to start there — or `null` when none does,
 * or when two do (a fork, which is never joined).
 * @param river - the piece being extended
 * @param others - the other pieces of the same name
 * @returns the continuation, reversed if it ran the other way, and its index in `others`
 */
function continuation(
  river: River,
  others: readonly River[]
): { next: River; index: number } | null {
  const end = river.points.at(-1)
  if (end === undefined) return null
  const found: { next: River; index: number }[] = []
  others.forEach((other, index) => {
    const first = other.points[0]
    const last = other.points.at(-1)
    if (first !== undefined && meets(end, first)) found.push({ next: other, index })
    else if (last !== undefined && meets(end, last))
      found.push({ next: { ...other, points: [...other.points].reverse() }, index })
  })
  const [only] = found
  return found.length === 1 && only !== undefined ? only : null
}

/**
 * Whether another piece also ends where `river` ends — the second arm of a fork, seen from the other side.
 * @param river - the piece being extended
 * @param pieces - every piece of the name, `river` included
 * @returns `true` when the end is shared with more than one other piece
 */
function endIsFork(river: River, pieces: readonly River[]): boolean {
  const end = river.points.at(-1)
  if (end === undefined) return false
  const touching = pieces.filter((piece) => {
    if (piece === river) return false
    const first = piece.points[0]
    const last = piece.points.at(-1)
    return (first !== undefined && meets(end, first)) || (last !== undefined && meets(end, last))
  })
  return touching.length > 1
}

/**
 * Join the pieces of one name end to end, as long as each meeting point is shared by exactly two pieces.
 * @param pieces - the centrelines of one name, fragments already dropped
 * @returns the joined rivers, and how many joins were made
 */
function joinPieces(pieces: readonly River[]): { rivers: River[]; joined: number } {
  const pending = [...pieces]
  const out: River[] = []
  let joined = 0
  while (pending.length > 0) {
    let current = pending.shift()
    if (current === undefined) break
    for (;;) {
      if (endIsFork(current, [current, ...pending, ...out])) break
      const found = continuation(current, pending)
      if (found === null) break
      pending.splice(found.index, 1)
      current = {
        ...current,
        rank: Math.min(current.rank, found.next.rank),
        points: [...current.points, ...found.next.points.slice(1)],
      }
      joined += 1
    }
    out.push(current)
  }
  return { rivers: out, joined }
}

/**
 * Mend every river: drop its fragments, join its pieces. Unnamed centrelines are left as they are — with no
 * name there is nothing to say two of them are one river.
 *
 * **Two passes, one from each end**: the first extends every piece from its end, the second from its
 * start — so the pieces join whatever order and direction the dataset listed them in.
 * @param rivers - the centrelines, as the source projected them
 * @returns the mended rivers and what was done to them
 */
export function mendRivers(rivers: readonly River[]): MendedRivers {
  const byName = new Map<string, River[]>()
  const unnamed: River[] = []
  for (const river of rivers) {
    if (river.name === null) unnamed.push(river)
    else byName.set(river.name, [...(byName.get(river.name) ?? []), river])
  }
  const out: River[] = [...unnamed]
  let dropped = 0
  let joined = 0
  for (const pieces of byName.values()) {
    const kept = withoutFragments(pieces)
    dropped += pieces.length - kept.length
    // Join from each end: a pass forward, then the same pass on the reversed results, so a piece that
    // continued the start of another is caught too.
    const forward = joinPieces(kept)
    const backward = joinPieces(
      forward.rivers.map((river) => ({ ...river, points: [...river.points].reverse() }))
    )
    joined += forward.joined + backward.joined
    out.push(...backward.rivers.map((river) => ({ ...river, points: [...river.points].reverse() })))
  }
  return { rivers: out, dropped, joined }
}
