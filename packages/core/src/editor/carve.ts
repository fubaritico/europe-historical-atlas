/**
 * Carving a vassal's new outline out of its suzerain's own domain (the dev, 2026-10-15, `s08` *"A new vassal
 * carves its ground out of its suzerain"*).
 *
 * Every outline closed for a vassal takes the ground under it from its suzerain's **own domain** — never from
 * a co-vassal, which it overlaps, and nothing already drawn is recomputed. What lies outside the suzerain's
 * domain stays the vassal's, adding to the suzerain's extent.
 *
 * Three steps, all on the document's own anchors so the new limit is **shared**, never copied:
 *
 * 1. **Crossings** — where the new outline crosses one of the suzerain's segments between two anchors, an
 *    anchor is placed at the crossing and inserted in every ring running over either segment.
 * 2. **Which segments bound what is left** — a segment of the suzerain or of the new outline is kept when
 *    the remaining domain (*in the suzerain, not in the new outline*) lies on exactly one side of it. A shared
 *    coast drops out; the vassal's limit inside the suzerain comes in; a segment outside the suzerain stays
 *    the vassal's alone.
 * 3. **Rings again** — the kept segments are walked into closed loops. The fill is even-odd, so any
 *    decomposition into loops encloses the same ground: no choice to make at a pinch, and an enclave comes
 *    out as a hole by itself.
 */

import { pointInRing, pointInRings } from '../geo/pointInRing'

import { edgeAt, everyRing, runStepAt } from './anchorEdits'
import { addAnchor, addOutline } from './documentEdits'
import { MIN_RING_ANCHORS } from './yearDocument'

import type { OutlinePoint } from './documentEdits'
import type { YearDocument } from './yearDocument'

/** What a carving did — for the status bar, and for a test to read. */
export interface Carving {
  /** The suzerain whose own domain was carved. */
  suzerain: string
  /** How many anchors were placed where the new outline crossed the suzerain's limit. */
  crossings: number
  /** How many rings the suzerain's own domain holds afterwards. */
  rings: number
}

/** Why a carving did not happen, when something should have. */
export interface CarvingFault {
  /** The suzerain whose domain was left as it was — the document is put back as it was before the carving. */
  suzerain: string
  /** What went wrong, for the console. */
  reason: string
}

/** A crossing found on a segment: where along it, and the anchor placed there. */
interface Crossing {
  /** How far along the segment, from its first anchor, 0 to 1. */
  along: number
  /** The anchor placed at the crossing. */
  anchor: number
}

/** How close to an end a crossing may sit before it is taken for the end itself. */
const END_TOLERANCE = 1e-9

/** How far either side of a segment its two sides are asked, as a fraction of its length. */
const SIDE_STEP = 1e-3

/**
 * Close an outline for a polity and carve it out of its suzerain's own domain — what the Pen does at close,
 * in one edit so one undo takes both back.
 * @param doc - the document
 * @param polityId - who the outline is drawn for
 * @param points - the outline's points, closure implied
 * @returns `closed: false` when the document refused the outline — and nothing was written; otherwise what
 *   the carving did, `null` when there was nothing to carve
 */
export function addOutlineCarving(
  doc: YearDocument,
  polityId: string,
  points: readonly OutlinePoint[]
): { closed: false } | { closed: true; carving: Carving | CarvingFault | null } {
  if (!addOutline(doc, polityId, points)) return { closed: false }
  const ring = doc.claims.find((claim) => claim.polity === polityId)?.rings.at(-1)
  // `addOutline` has just pushed this ring: its absence is a defect, reported as a fault, never skipped.
  if (ring === undefined) {
    const suzerain = doc.polities.find((polity) => polity.id === polityId)?.suzerain ?? polityId
    return {
      closed: true,
      carving: { suzerain, reason: 'the closed outline is not in the document' },
    }
  }
  return { closed: true, carving: carveOutOfSuzerain(doc, polityId, ring) }
}

/**
 * Carve a vassal's newly closed outline out of its suzerain's own domain.
 * @param doc - the document, the outline already closed into it
 * @param vassalId - the polity whose outline was closed
 * @param ring - the outline's anchors — the ring as it sits in the document, edited in place by crossings
 * @returns what was carved; `null` when there was nothing to carve (no suzerain, no own domain, no overlap);
 *   a fault when it could not be done — and then the document is exactly as it was before the call:
 *   crossing anchors already placed are taken back out (review QUAL-001, 2026-10-15)
 */
export function carveOutOfSuzerain(
  doc: YearDocument,
  vassalId: string,
  ring: number[]
): Carving | CarvingFault | null {
  const suzerain = doc.polities.find((polity) => polity.id === vassalId)?.suzerain ?? null
  if (suzerain === null) return null
  const claim = doc.claims.find((each) => each.polity === suzerain)
  if (claim === undefined || claim.rings.length === 0) return null

  const putBack = snapshotOf(doc)
  const crossings = placeCrossings(doc, claim.rings, ring)
  if (typeof crossings === 'string') {
    putBack()
    return { suzerain, reason: crossings }
  }
  const at = (index: number): [number, number] | undefined => doc.anchors[index]
  const domain = claim.rings.map((each) => resolve(each, at))
  const outline = resolve(ring, at)
  const remains = (point: [number, number]): boolean =>
    pointInRings(point, domain) && !pointInRing(point, outline)

  const kept = candidateSegments([...claim.rings, ring]).filter(([from, to]) =>
    bounds(at(from), at(to), remains)
  )
  // Compared with what the domain alone would keep, not with its rings: a zero-width spike of the domain
  // bounds nothing either way, and must not be cleaned out by a vassal drawn beside it.
  const alone = candidateSegments(claim.rings).filter(([from, to]) =>
    bounds(at(from), at(to), (point) => pointInRings(point, domain))
  )
  if (crossings === 0 && sameSegments(alone, kept)) return null

  const loops = loopsOf(kept, (index) => positionKey(at(index), index))
  if (loops === null) {
    putBack()
    return { suzerain, reason: 'an anchor of the carved domain ends an odd number of segments' }
  }
  claim.rings = loops.filter((loop) => loop.length >= MIN_RING_ANCHORS)
  return { suzerain, crossings, rings: claim.rings.length }
}

/**
 * What the carving may change — every ring and dressed run, the anchors and their sources — and a way to put
 * it all back, so a carving that fails leaves nothing behind.
 * @param doc - the document
 * @returns the function that restores the document
 */
function snapshotOf(doc: YearDocument): () => void {
  const rings = everyRing(doc).map((live) => [live, [...live]] as const)
  const runs = doc.runs.map((dressed) => [dressed.run, [...dressed.run]] as const)
  const anchors = doc.anchors.length
  const sources = doc.anchorSource.length
  return () => {
    for (const [live, copy] of [...rings, ...runs]) live.splice(0, live.length, ...copy)
    doc.anchors.length = anchors
    doc.anchorSource.length = sources
  }
}

/**
 * Every segment of some rings, each once whichever way it is walked.
 * @param rings - the rings, closure implied
 * @returns the segments, as pairs of anchors
 */
function candidateSegments(rings: readonly number[][]): [number, number][] {
  const found = new Map<string, [number, number]>()
  for (const ring of rings) {
    if (ring.length < MIN_RING_ANCHORS) continue
    for (const [from, to] of segmentsOf(ring)) found.set(keyOf(from, to), [from, to])
  }
  return [...found.values()]
}

/**
 * Whether two lists hold the same segments, whichever way each is walked.
 * @param a - one list
 * @param b - the other
 * @returns `true` when the outline took nothing from the domain
 */
function sameSegments(a: readonly [number, number][], b: readonly [number, number][]): boolean {
  if (a.length !== b.length) return false
  const keys = new Set(a.map(([from, to]) => keyOf(from, to)))
  return b.every(([from, to]) => keys.has(keyOf(from, to)))
}

/**
 * Where an anchor sits, as a key — two anchors at the same position are one vertex to the walk.
 *
 * **Measured on 1100 (2026-10-15)**: the Franks' ring runs up a river near Ghent and back down it over
 * other anchors at the very same positions — a spike of no width, which bounds nothing and drops out, leaving
 * its two bases each ending one segment. Keyed by index they never close; keyed by position they are one.
 * @param point - the anchor's position
 * @param index - its index, the key of an anchor with no position
 * @returns the key
 */
function positionKey(point: [number, number] | undefined, index: number): string {
  return point === undefined ? `#${String(index)}` : `${String(point[0])},${String(point[1])}`
}

/**
 * Every pair of segments to test for a crossing: one of the outline's against one of the domain's, never
 * two sharing an anchor — those meet at it, they do not cross.
 * @param ring - the new outline
 * @param domain - the suzerain's rings
 * @returns the pairs, as `[a, b, c, d]`
 */
function pairsToTest(
  ring: readonly number[],
  domain: readonly number[][]
): [number, number, number, number][] {
  // Each segment once (review ARCH-102): a ring walking one segment out and back would find its crossing
  // twice, and place two anchors where the limits cross once.
  const own = candidateSegments(domain)
  return candidateSegments([[...ring]]).flatMap(([a, b]) =>
    own
      .filter(([c, d]) => a !== c && a !== d && b !== c && b !== d)
      .map(([c, d]) => [a, b, c, d] as [number, number, number, number])
  )
}

/**
 * Place an anchor wherever the new outline crosses a suzerain segment between anchors, and insert it in
 * every ring running over either segment — the suzerain's, the outline's, and a neighbour sharing them.
 * @param doc - the document
 * @param domain - the suzerain's rings
 * @param ring - the new outline
 * @returns how many anchors were placed, or why one could not be — the caller puts the document back
 */
function placeCrossings(
  doc: YearDocument,
  domain: readonly number[][],
  ring: readonly number[]
): number | string {
  const onSegment = new Map<string, { from: number; to: number; crossings: Crossing[] }>()
  const note = (from: number, to: number, crossing: Crossing): void => {
    const key = `${String(from)}>${String(to)}`
    const found = onSegment.get(key)
    if (found) found.crossings.push(crossing)
    else onSegment.set(key, { from, to, crossings: [crossing] })
  }
  let placed = 0
  for (const [a, b, c, d] of pairsToTest(ring, domain)) {
    const hit = crossingOf(doc.anchors[a], doc.anchors[b], doc.anchors[c], doc.anchors[d])
    if (hit === null) continue
    // The crossing lies on the suzerain's limit, so it takes that limit's source — never a substitute.
    const sourceId = doc.anchorSource[c]
    if (sourceId === undefined) return `anchor ${String(c)} of the suzerain has no source`
    const anchor = addAnchor(doc, hit.point, sourceId)
    placed += 1
    note(a, b, { along: hit.alongFirst, anchor })
    note(c, d, { along: hit.alongSecond, anchor })
  }
  for (const { from, to, crossings } of onSegment.values()) {
    const ordered = [...crossings].sort((x, y) => x.along - y.along).map((each) => each.anchor)
    insertAlong(doc, from, to, ordered)
  }
  return placed
}

/**
 * Insert anchors, ordered from `from` to `to`, on that segment of every ring and dressed run holding it.
 * @param doc - the document
 * @param from - the segment's first anchor
 * @param to - its second
 * @param ordered - the anchors to insert, in order from `from`
 */
function insertAlong(
  doc: YearDocument,
  from: number,
  to: number,
  ordered: readonly number[]
): void {
  for (const each of everyRing(doc)) {
    const position = edgeAt(each, from, to)
    if (position < 0) continue
    const forward = each[position] === from
    each.splice(position + 1, 0, ...(forward ? ordered : [...ordered].reverse()))
  }
  for (const dressed of doc.runs) {
    const position = runStepAt(dressed.run, from, to)
    if (position < 0) continue
    const forward = dressed.run[position] === from
    dressed.run.splice(position + 1, 0, ...(forward ? ordered : [...ordered].reverse()))
  }
}

/** A ring's segments, closure included, as pairs of anchors. */
function segmentsOf(ring: readonly number[]): [number, number][] {
  if (ring.length < 2) return []
  return ring.flatMap((from, position) => {
    const to = ring[(position + 1) % ring.length]
    return to === undefined || to === from ? [] : [[from, to] as [number, number]]
  })
}

/** Whether a position along a segment lies strictly inside it, its two ends excluded. */
const inside = (t: number): boolean => t > END_TOLERANCE && t < 1 - END_TOLERANCE

/**
 * Where two segments cross strictly inside both — not at an end, not along a shared line.
 * @param a - the first segment's start
 * @param b - its end
 * @param c - the second segment's start
 * @param d - its end
 * @returns the crossing and how far along each segment it lies, or `null`
 */
function crossingOf(
  a: [number, number] | undefined,
  b: [number, number] | undefined,
  c: [number, number] | undefined,
  d: [number, number] | undefined
): { point: [number, number]; alongFirst: number; alongSecond: number } | null {
  if (a === undefined || b === undefined || c === undefined || d === undefined) return null
  const rx = b[0] - a[0]
  const ry = b[1] - a[1]
  const sx = d[0] - c[0]
  const sy = d[1] - c[1]
  const denominator = rx * sy - ry * sx
  if (denominator === 0) return null
  const qx = c[0] - a[0]
  const qy = c[1] - a[1]
  const alongFirst = (qx * sy - qy * sx) / denominator
  const alongSecond = (qx * ry - qy * rx) / denominator
  if (!inside(alongFirst) || !inside(alongSecond)) return null
  return { point: [a[0] + alongFirst * rx, a[1] + alongFirst * ry], alongFirst, alongSecond }
}

/**
 * Whether a segment has the remaining domain on exactly one side.
 * @param a - one end
 * @param b - the other
 * @param remains - whether a point is still the suzerain's own
 * @returns `true` when the segment bounds what remains
 */
function bounds(
  a: [number, number] | undefined,
  b: [number, number] | undefined,
  remains: (point: [number, number]) => boolean
): boolean {
  if (a === undefined || b === undefined) return false
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const nx = -(b[1] - a[1]) * SIDE_STEP
  const ny = (b[0] - a[0]) * SIDE_STEP
  if (nx === 0 && ny === 0) return false
  return remains([mid[0] + nx, mid[1] + ny]) !== remains([mid[0] - nx, mid[1] - ny])
}

/**
 * Walk segments into closed loops. Every vertex must end an even number of them, which a boundary always
 * does; when one does not, the segments do not close and `null` says so.
 *
 * Vertices are keyed by **position** (`vertexOf`), the loops written in **anchors**: where the walk passes
 * from one anchor to another at the same place, both are written, a hop of no length — so each segment keeps
 * the anchors a neighbour shares with it.
 * @param segments - the segments, as pairs of anchors
 * @param vertexOf - the vertex an anchor sits on
 * @returns the loops, each a ring of anchors, or `null` when the segments do not close
 */
function loopsOf(
  segments: readonly [number, number][],
  vertexOf: (anchor: number) => string
): number[][] | null {
  const at = new Map<string, number[]>()
  segments.forEach(([from, to], position) => {
    for (const end of [vertexOf(from), vertexOf(to)]) {
      const list = at.get(end)
      if (list) list.push(position)
      else at.set(end, [position])
    }
  })
  for (const list of at.values()) if (list.length % 2 !== 0) return null
  const used = new Set<number>()
  const loops: number[][] = []
  for (const [first, segment] of segments.entries()) {
    if (used.has(first)) continue
    used.add(first)
    const loop = walkLoop(segment, segments, at, used, vertexOf)
    if (loop === null) return null
    loops.push(loop)
  }
  return loops
}

/**
 * Walk one loop from a segment until it comes back to the vertex it started on.
 * @param start - the first segment
 * @param segments - every segment
 * @param at - the segments at each vertex, by position in `segments`
 * @param used - the segments already walked, added to
 * @param vertexOf - the vertex an anchor sits on
 * @returns the loop's anchors, or `null` when it ran out of segments before closing
 */
function walkLoop(
  start: readonly [number, number],
  segments: readonly [number, number][],
  at: ReadonlyMap<string, readonly number[]>,
  used: Set<number>,
  vertexOf: (anchor: number) => string
): number[] | null {
  const [first, second] = start
  const home = vertexOf(first)
  const loop = [first]
  let anchor = second
  while (vertexOf(anchor) !== home) {
    loop.push(anchor)
    const exit = (at.get(vertexOf(anchor)) ?? []).find((position) => !used.has(position))
    const segment = exit === undefined ? undefined : segments[exit]
    if (exit === undefined || segment === undefined) return null
    used.add(exit)
    const [from, to] =
      vertexOf(segment[0]) === vertexOf(anchor) ? segment : [segment[1], segment[0]]
    if (from !== anchor) loop.push(from)
    anchor = to
  }
  if (anchor !== first) loop.push(anchor)
  return loop
}

/** A ring's anchors as coordinates, a missing index skipped. */
function resolve(
  ring: readonly number[],
  at: (index: number) => [number, number] | undefined
): [number, number][] {
  return ring.flatMap((index) => {
    const point = at(index)
    return point === undefined ? [] : [point]
  })
}

/** The key of an unordered segment. */
function keyOf(a: number, b: number): string {
  return a < b ? `${String(a)}:${String(b)}` : `${String(b)}:${String(a)}`
}
