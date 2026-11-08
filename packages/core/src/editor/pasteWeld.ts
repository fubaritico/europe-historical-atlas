/**
 * The weld at paste — what makes a pasted outline **share** the points of the map it lands in (CARTO-345, `s22`,
 * the dev, 2026-11-03 and 2026-11-05).
 *
 * A pasted outline comes as coordinates (`clipboard.ts`): left as they are, its points would be a second geometry
 * beside its new neighbours' — a sliver or an overlap at every border, what `s00` forbids. So, before the outline
 * enters the map, each of its points is welded:
 *
 * 1. **onto a point** of the map within the weld distance — the map's point stays, the pasted one goes;
 * 2. else **onto a stretch** of the map within it — a point is put on that stretch, in every ring running over it,
 *    so the neighbour gains it (`insertAnchorOnStretch`), and the pasted outline takes it; a later pasted point within
 *    the weld distance of a point put so takes that same point;
 * 3. and **between two points of the pasted outline welded onto one neighbour's outline**, the pasted outline
 *    follows the neighbour's points (the dev, 2026-11-05): the map's border wins, as it wins the cut. The shorter
 *    way round — measured on the backup's 118 polities absent from `1100`, 2026-11-05: of 17 481 such pairs, 99 %
 *    follow a run as long as their own straight edge, none over three times it beyond 5 km.
 *
 * **The map it welds onto is the map before the paste**: the pasted polity's rings do not weld onto one another.
 */

import { openRings, outlineFloor, segmentCount } from '../data/outlines'
import { referencedAnchors } from '../data/yearDocument'
import { footOnSegment, groundKm } from '../geo/groundDistance'
import { SpatialCells, inGeoBox, paddedBox } from '../geo/spatialCells'

import { everyRing, insertAnchorOnStretch } from './anchorEdits'

import type { ClipboardPoint } from './clipboard'
import type { OutlinePoint, Provenance } from './documentEdits'
import type { YearDocument } from '../data/yearDocument'
import type { GeoBox } from '../geo/spatialCells'

/**
 * How far a pasted point is welded onto the map's, on the ground — **2 km** (the dev, 2026-11-03: *"it's a matter
 * of practice and trial"*), one constant for edge points and coast points alike.
 */
export const PASTE_WELD_KM = 2

/** A pasted ring, welded: the points to close it with, and how many of the copied ones took a point of the map. */
export interface WeldedRing {
  /** The outline's points, closure implied: a map's anchor where welded or followed, else the copied point. */
  points: OutlinePoint[]
  /** How many of the copied points took a point of the map — onto a point or onto a stretch. */
  welded: number
}

/**
 * An anchor's position.
 * @param doc - the map
 * @param index - the anchor
 * @returns its `[longitude, latitude]`
 * @throws when the index is past the table — every index read here comes from the map's own rings
 */
function positionOf(doc: YearDocument, index: number): [number, number] {
  const at = doc.anchors[index]
  if (at === undefined) throw new Error(`[Cartographer] anchor ${String(index)} is not in the map.`)
  return at
}

/**
 * An anchor's provenance, as the map records it.
 * @param doc - the map
 * @param index - the anchor
 * @returns its source's name and licence
 * @throws when its source is not declared — a map opened is cross-checked, so this is a defect
 */
function provenanceOf(doc: YearDocument, index: number): Provenance {
  const source = doc.sources.find((each) => each.id === doc.anchorSource[index])
  if (source === undefined) {
    throw new Error(`[Cartographer] anchor ${String(index)} has no declared source.`)
  }
  return { name: source.name, licence: source.licence }
}

/**
 * The map's anchor nearest a point, within a distance.
 * @param doc - the map
 * @param candidates - the anchors worth asking
 * @param point - the pasted point
 * @param km - the weld distance
 * @returns the anchor, or `null` when none is within reach
 */
function nearestAnchor(
  doc: YearDocument,
  candidates: readonly number[],
  point: readonly [number, number],
  km: number
): number | null {
  let best: number | null = null
  let reach = km
  for (const index of candidates) {
    const distance = groundKm(point, positionOf(doc, index))
    if (distance <= reach) {
      reach = distance
      best = index
    }
  }
  return best
}

/** A stretch of the map a pasted point lies near: its two anchors, and the point's foot on it. */
interface StretchHit {
  /** One end. */
  a: number
  /** The other. */
  b: number
  /** Where on it the pasted point is put. */
  at: [number, number]
}

/**
 * The key of a stretch, whichever way it is walked.
 * @param a - one end
 * @param b - the other
 * @returns `low:high`
 */
function stretchKey(a: number, b: number): string {
  return a < b ? `${String(a)}:${String(b)}` : `${String(b)}:${String(a)}`
}

/** The map's stretches near a paste, filed by cell, kept in step with every point put on one. */
interface Stretches {
  /** Every stretch, as a pair of anchors, filed along itself. */
  cells: SpatialCells<[number, number]>
  /** The keys of the stretches split by a point put on them — no longer in any ring. */
  split: Set<string>
  /** The points put on stretches during this paste, so a later pasted point near one takes it. */
  placed: SpatialCells<number>
}

/**
 * The stretch of the map nearest a point, within a distance — strictly between its ends, which the anchor weld
 * already answers for.
 * @param doc - the map
 * @param stretches - the stretches near the paste
 * @param point - the pasted point
 * @param km - the weld distance
 * @returns the stretch and the foot, or `null`
 */
function nearestStretch(
  doc: YearDocument,
  stretches: Stretches,
  point: readonly [number, number],
  km: number
): StretchHit | null {
  let best: StretchHit | null = null
  let reach = km
  for (const [a, b] of stretches.cells.near(point)) {
    if (stretches.split.has(stretchKey(a, b))) continue
    const foot = footOnSegment(point, positionOf(doc, a), positionOf(doc, b))
    // Strictly nearer: on a tie the stretch filed first wins — a split one, were `split` not kept, so it is.
    if (foot.km < reach && foot.along > 0 && foot.along < 1) {
      reach = foot.km
      best = { a, b, at: foot.at }
    }
  }
  return best
}

/**
 * Whether a stretch's own box meets a box — a long stretch crosses the paste's box with both ends outside it, which
 * Cliopatria's borders do.
 * @param a - one end
 * @param b - the other
 * @param box - the box
 * @returns `true` when the two boxes overlap
 */
function stretchMeets(
  a: readonly [number, number],
  b: readonly [number, number],
  box: GeoBox
): boolean {
  return (
    Math.max(a[0], b[0]) >= box[0] &&
    Math.min(a[0], b[0]) <= box[2] &&
    Math.max(a[1], b[1]) >= box[1] &&
    Math.min(a[1], b[1]) <= box[3]
  )
}

/**
 * Every stretch of the map whose box meets the paste's, each once whichever way it is walked, filed along itself.
 * @param doc - the map
 * @param box - the paste's box
 * @param km - the weld distance, a cell's least side
 * @returns the stretches
 */
function stretchesIn(doc: YearDocument, box: GeoBox, km: number): Stretches {
  const stretches: Stretches = {
    cells: new SpatialCells(box, km),
    split: new Set(),
    placed: new SpatialCells(box, km),
  }
  const seen = new Set<string>()
  const open = openRings(doc.claims)
  for (const ring of everyRing(doc)) {
    // An open outline's two ends are joined by no stretch: nothing is put on that line.
    const segments = segmentCount(ring, open.has(ring))
    ring.forEach((a, position) => {
      if (position >= segments) return
      const b = ring[(position + 1) % ring.length]
      if (b === undefined || b === a || seen.has(stretchKey(a, b))) return
      const from = positionOf(doc, a)
      const to = positionOf(doc, b)
      if (!stretchMeets(from, to, box)) return
      seen.add(stretchKey(a, b))
      stretches.cells.addSegment([a, b], from, to)
    })
  }
  return stretches
}

/**
 * The rings of the map holding each of some anchors.
 * @param doc - the map
 * @param anchors - the anchors asked about
 * @returns each anchor's rings, live
 */
function ringsHolding(doc: YearDocument, anchors: ReadonlySet<number>): Map<number, number[][]> {
  const found = new Map<number, number[][]>()
  const open = openRings(doc.claims)
  for (const ring of everyRing(doc)) {
    // A pasted outline never follows an open outline of the map: its two ends are joined by no border to follow.
    if (open.has(ring)) continue
    for (const index of new Set(ring)) {
      if (!anchors.has(index)) continue
      const list = found.get(index)
      if (list) list.push(ring)
      else found.set(index, [ring])
    }
  }
  return found
}

/**
 * How many points a ring keeps once consecutive repeats are dropped — the closing pair included, but for an open
 * piece, whose two ends are not joined.
 * @param onAnchor - the map's anchor each pasted point took, `null` for none — each a point of its own
 * @param open - whether the pasted ring is an open piece
 * @returns the count
 */
function keptCount(onAnchor: readonly (number | null)[], open: boolean): number {
  const keys = onAnchor.map((anchor, at) => anchor ?? `own:${String(at)}`)
  const last = keys.length - 1
  return keys.filter((key, at) => (open && at === last) || key !== keys[(at + 1) % keys.length])
    .length
}

/**
 * The anchor at a position of a ring.
 * @param ring - the ring
 * @param at - the position, within it
 * @returns the anchor
 * @throws when the position is past the ring — every position read here is taken modulo its length
 */
function anchorAt(ring: readonly number[], at: number): number {
  const index = ring[at]
  if (index === undefined) throw new Error(`[Cartographer] no anchor at position ${String(at)}.`)
  return index
}

/**
 * The anchors a ring runs over from one position to another, both excluded, walked one way.
 * @param ring - the ring
 * @param start - where the walk starts
 * @param end - where it stops
 * @param way - `1` along the ring, `-1` against it
 * @returns the anchors between, in walking order
 */
function between(ring: readonly number[], start: number, end: number, way: 1 | -1): number[] {
  const run: number[] = []
  const n = ring.length
  for (let at = (start + way + n) % n; at !== end; at = (at + way + n) % n) {
    run.push(anchorAt(ring, at))
  }
  return run
}

/**
 * The run of a map's ring between two of its anchors, ends excluded — the shorter way round, on the ground.
 *
 * **Both ways are walked at once**, the one walked least so far stepping next, and the first to arrive having walked
 * no more than the other wins — so a pair a few kilometres apart on a ring of two thousand points reads a few of
 * them, not the whole ring twice.
 * @param doc - the map
 * @param ring - the ring
 * @param from - one anchor
 * @param to - the other
 * @returns the anchors between them, in order from `from`
 * @throws when the two ways together walk more than twice round the ring — a position that is not a number makes
 *   every comparison false, and the walk would never end
 */
function shorterRun(
  doc: YearDocument,
  ring: readonly number[],
  from: number,
  to: number
): number[] {
  const n = ring.length
  const start = ring.indexOf(from)
  const end = ring.indexOf(to)
  const walked = { 1: 0, [-1]: 0 }
  const reached = { 1: start, [-1]: start }
  const step = (way: 1 | -1): void => {
    const next = (reached[way] + way + n) % n
    walked[way] += groundKm(
      positionOf(doc, anchorAt(ring, reached[way])),
      positionOf(doc, anchorAt(ring, next))
    )
    reached[way] = next
  }
  for (let steps = 0; steps <= 2 * n; steps += 1) {
    const forwardIn = reached[1] === end
    const backwardIn = reached[-1] === end
    if (forwardIn && walked[1] <= walked[-1]) return between(ring, start, end, 1)
    if (backwardIn && walked[-1] <= walked[1]) return between(ring, start, end, -1)
    step(forwardIn || (!backwardIn && walked[-1] < walked[1]) ? -1 : 1)
  }
  throw new Error(
    `[Cartographer] no shorter way found between anchors ${String(from)} and ${String(to)}.`
  )
}

/**
 * The anchors a pasted outline follows between two of its points welded onto the map — the shorter run of the first
 * ring of the map holding both, or nothing when no ring does or they are neighbours on it.
 * @param doc - the map
 * @param rings - the rings holding each welded anchor
 * @param from - the first welded point's anchor
 * @param to - the next one's
 * @returns the anchors between them, in order
 */
function followedRun(
  doc: YearDocument,
  rings: ReadonlyMap<number, number[][]>,
  from: number,
  to: number
): number[] {
  // An anchor no ring holds is followed by nothing: an empty run, not a missing one.
  const ring = (rings.get(from) ?? []).find((each) => each.includes(to))
  return ring === undefined ? [] : shorterRun(doc, ring, from, to)
}

/**
 * Weld the pasted points that lie near no point of the map: onto a point put on a stretch earlier in this paste
 * within reach, else onto the nearest stretch within reach — a point is put on it in every ring running over it.
 * @param doc - the map, gaining the points put on its stretches
 * @param ring - the pasted points
 * @param onAnchor - the map's anchor each pasted point took, `null` for none — completed here
 * @param stretches - the map's stretches near the paste, kept in step with every point put on one
 * @param km - the weld distance
 */
function weldOntoStretches(
  doc: YearDocument,
  ring: readonly ClipboardPoint[],
  onAnchor: (number | null)[],
  stretches: Stretches,
  km: number
): void {
  ring.forEach((point, at) => {
    if (onAnchor[at] !== null) return
    const earlier = nearestAnchor(doc, stretches.placed.near(point.at), point.at, km)
    if (earlier !== null) {
      onAnchor[at] = earlier
      return
    }
    const hit = nearestStretch(doc, stretches, point.at, km)
    if (hit === null) return
    const index = insertAnchorOnStretch(doc, hit.a, hit.b, hit.at, provenanceOf(doc, hit.a))
    // The stretch was read off the map's rings and kept in step with every insertion: its absence is a defect.
    if (index === null) {
      throw new Error(
        `[Cartographer] the stretch ${String(hit.a)}–${String(hit.b)} is in no ring of the map.`
      )
    }
    onAnchor[at] = index
    stretches.split.add(stretchKey(hit.a, hit.b))
    stretches.placed.addPoint(index, hit.at)
    stretches.cells.addSegment([hit.a, index], positionOf(doc, hit.a), hit.at)
    stretches.cells.addSegment([index, hit.b], hit.at, positionOf(doc, hit.b))
  })
}

/**
 * The map's anchor each pasted point lies near — `null` for none — or `null` for the whole ring when the weld would
 * leave it under its floor (`outlineFloor`) points.
 * @param doc - the map
 * @param anchors - the map's anchors near the paste, filed by cell
 * @param ring - the pasted points
 * @param km - the weld distance
 * @param open - whether the pasted ring is an open piece, which stands on two points
 * @returns the anchor per point, or `null` when the ring is not to be welded
 */
function anchorsOf(
  doc: YearDocument,
  anchors: SpatialCells<number>,
  ring: readonly ClipboardPoint[],
  km: number,
  open: boolean
): (number | null)[] | null {
  const onAnchor = ring.map((point) => nearestAnchor(doc, anchors.near(point.at), point.at, km))
  return keptCount(onAnchor, open) < outlineFloor(open) ? null : onAnchor
}

/**
 * A welded ring's points: the map's anchor where a pasted point was welded, the neighbour's run between two welded
 * points, the copied point elsewhere — consecutive repeats dropped.
 * @param doc - the map
 * @param ring - the pasted points
 * @param onAnchor - the map's anchor each took, `null` for none
 * @param rings - the map's rings holding each welded anchor
 * @param open - whether the pasted ring is an open piece: nothing is followed, nor dropped, across its two ends
 * @returns the outline's points, closure implied for a closed ring
 */
function outlineOf(
  doc: YearDocument,
  ring: readonly ClipboardPoint[],
  onAnchor: readonly (number | null)[],
  rings: ReadonlyMap<number, number[][]>,
  open: boolean
): OutlinePoint[] {
  const points: OutlinePoint[] = []
  const take = (index: number): void => {
    points.push({ at: positionOf(doc, index), provenance: provenanceOf(doc, index), anchor: index })
  }
  ring.forEach((point, at) => {
    const anchor = onAnchor[at] ?? null
    if (anchor === null) {
      points.push({ at: point.at, provenance: point.provenance })
      return
    }
    take(anchor)
    const next = open && at === ring.length - 1 ? null : (onAnchor[(at + 1) % ring.length] ?? null)
    if (next !== null && next !== anchor) followedRun(doc, rings, anchor, next).forEach(take)
  })
  const last = points.length - 1
  return points.filter(
    (point, at) =>
      point.anchor === undefined ||
      (open && at === last) ||
      point.anchor !== points[(at + 1) % points.length]?.anchor
  )
}

/**
 * A ring pasted with its own points.
 * @param ring - the pasted points
 * @returns the ring, nothing welded
 */
function unwelded(ring: readonly ClipboardPoint[]): WeldedRing {
  return {
    points: ring.map((point) => ({ at: point.at, provenance: point.provenance })),
    welded: 0,
  }
}

/**
 * Weld a pasted polity's rings onto the map they land in: each point onto a point of the map within `km`, else onto
 * a stretch of it, and the run between two welded points onto the neighbour's points.
 *
 * **The map they weld onto is the map before the paste**, read once for all the rings — the rings do not weld onto
 * one another, and a polity of two hundred islands (Norway in the backup) costs one reading, not two hundred.
 *
 * **A ring the weld would leave under its floor (`outlineFloor`) points keeps its own points** — an islet narrower than
 * the weld distance, met wholly by the map's points (my choice, 2026-11-05). Decided before anything is written when
 * the map's points close it; when points put on stretches close it, those points stay on the neighbour's stretches,
 * where they change no shape.
 * @param doc - the target map, before the pasted outlines enter it; gains the points put on its stretches
 * @param rings - the pasted rings, closure implied
 * @param km - the weld distance, {@link PASTE_WELD_KM} in the application; above zero
 * @param open - per ring, whether it is an open piece (`open-outlines.md`) — a ring past the list's end is closed
 * @returns per ring, the points to close it with and how many copied points were welded
 */
export function weldPastedRings(
  doc: YearDocument,
  rings: readonly (readonly ClipboardPoint[])[],
  km: number,
  open: readonly boolean[] = []
): WeldedRing[] {
  if (rings.length === 0) return []
  const box = paddedBox(
    rings.flatMap((ring) => ring.map((point) => point.at)),
    km
  )
  const anchors = new SpatialCells<number>(box, km)
  for (const index of referencedAnchors(doc)) {
    const at = positionOf(doc, index)
    if (inGeoBox(at, box)) anchors.addPoint(index, at)
  }
  const isOpen = (at: number): boolean => open[at] === true
  const welds = rings.map((ring, at) => anchorsOf(doc, anchors, ring, km, isOpen(at)))
  const stretches = stretchesIn(doc, box, km)
  rings.forEach((ring, at) => {
    const onAnchor = welds[at]
    if (!onAnchor) return
    weldOntoStretches(doc, ring, onAnchor, stretches, km)
    if (keptCount(onAnchor, isOpen(at)) < outlineFloor(isOpen(at))) welds[at] = null
  })
  const welded = welds.flatMap((onAnchor) => (onAnchor ?? []).filter((index) => index !== null))
  const holding = ringsHolding(doc, new Set(welded))
  return rings.map((ring, at) => {
    const onAnchor = welds[at] ?? null
    if (onAnchor === null) return unwelded(ring)
    return {
      points: outlineOf(doc, ring, onAnchor, holding, isOpen(at)),
      welded: onAnchor.filter((index) => index !== null).length,
    }
  })
}
