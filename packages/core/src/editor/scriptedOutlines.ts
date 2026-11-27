import { everyOutline } from '../data/outlines'
import { referencedAnchors } from '../data/yearDocument'
import { kmPerDegreeOfLatitude, kmPerDegreeOfLongitude } from '../geo/groundDistance'
import { SpatialCells, inGeoBox, paddedBox } from '../geo/spatialCells'

import { addOutlineCarving, openSuzerainOf } from './carve'
import { isRetraceRefusal, retraceArcs, retraceStretch } from './retrace'

import type { Carving, CarvingFault, CarvingHeld } from './carve'
import type { OutlinePoint } from './documentEdits'
import type { Provenance } from '../data/provenance'
import type { YearDocument } from '../data/yearDocument'

/**
 * Outlines laid by a script (CARTO-584, the dev, 2026-11-27: *« procéder comme une machine et comme un programme »*) — the
 * historian's drawing plans, computed and checked on witness cities before any gesture, laid whole instead of one
 * simulated Pen click a point (307 for Holstein).
 *
 * - {@link placeScriptedRing} closes a ring given by its positions, **through the Pen's own closing**
 *   (`carve.addOutlineCarving`): a vassal carved out of its suzerain's own domain, an anchor placed where limits cross,
 *   the same refusals — no side path.
 * - {@link replaceScriptedRun} replaces the stretch between two anchors in every ring running over it, **through the
 *   retrace** (`retrace.retraceStretch`): the neighbours follow together. Which way round is the stretch: the one with
 *   fewer anchors, every polity holding both anchors agreeing, or the polity named.
 *
 * **A position is where the anchor goes** — never snapped to a river or the coast; it **is** a live anchor (one a ring
 * holds) lying within {@link REUSE_METRES} of it, so the border is shared, never doubled. Everything is checked before
 * anything is written: a refusal leaves the document as it was, and says why.
 */

/** How near a live anchor a position must lie to be that anchor, in metres — the ticket's default. */
export const REUSE_METRES = 1

/** What a scripted gesture answered. */
export interface ScriptedAnswer {
  /** Whether it was done. */
  ok: boolean
  /** The anchors of the ring closed, or of the run laid — empty when refused. */
  ring: number[]
  /** How many positions were existing anchors. */
  reused: number
  /** How many anchors were created for positions. */
  created: number
  /** The suzerain carved, or `null`. */
  carved: string | null
  /** The anchors a run replaced, from its start — {@link replaceScriptedRun}'s only, for a script to check. */
  replaced?: number[]
  /** How many anchors the carving placed where limits crossed. */
  crossings: number
  /** Why it was refused — or, on a ring closed, why its carving was not done; absent otherwise. */
  refusal?: string
}

/** The options both gestures take. */
export interface ScriptedOptions {
  /** How near a live anchor a position is that anchor, in metres; {@link REUSE_METRES} by default. */
  reuseMetres?: number
  /**
   * Whose ring decides the run, where two polities' rings run between the two anchors differently — read by
   * {@link replaceScriptedRun} only.
   */
  polity?: string
}

/** A position, `[longitude, latitude]`. */
export type Position = readonly [number, number]

/**
 * A refusal: nothing written.
 * @param refusal - why
 * @returns the answer
 */
function refused(refusal: string): ScriptedAnswer {
  return { ok: false, ring: [], reused: 0, created: 0, carved: null, crossings: 0, refusal }
}

/**
 * Whether every position is two finite numbers — checked at run time: the positions come from a script in the page's
 * console, which no type reaches.
 * @param positions - the positions
 * @returns `true` when they are
 */
function allFinite(positions: readonly unknown[]): boolean {
  return positions.every(
    (position) =>
      Array.isArray(position) &&
      position.length === 2 &&
      position.every((value) => typeof value === 'number' && Number.isFinite(value))
  )
}

/**
 * Which side of a line a point lies, by the sign of the cross product.
 * @param a - the line's start
 * @param b - its end
 * @param c - the point
 * @returns positive, negative, or zero on the line
 */
function side(a: Position, b: Position, c: Position): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

/**
 * Whether two segments cross at a point inside both — a touch at an end does not count.
 * @param a - the first segment's start
 * @param b - its end
 * @param c - the second segment's start
 * @param d - its end
 * @returns `true` when they cross
 */
function segmentsCross(a: Position, b: Position, c: Position, d: Position): boolean {
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0
}

/**
 * Whether a closed ring crosses itself: two of its sides, not neighbours, cross.
 * @param positions - the ring, closure implied
 * @returns `true` when it does
 */
export function ringCrossesItself(positions: readonly Position[]): boolean {
  const count = positions.length
  for (let i = 0; i < count; i++) {
    const a = positions[i]
    const b = positions[(i + 1) % count]
    for (let j = i + 2; j < count; j++) {
      if (i === 0 && j === count - 1) continue
      const c = positions[j]
      const d = positions[(j + 1) % count]
      if (a && b && c && d && segmentsCross(a, b, c, d)) return true
    }
  }
  return false
}

/** The most a script may reach for an anchor to reuse, in metres: past it, the grid's cells are too wide to read. */
const MAX_REUSE_METRES = 1000

/**
 * Why a distance of reuse cannot be read, or `null` when it can — a script's option, which no type reaches.
 * @param metres - the distance
 * @returns the refusal, or `null`
 */
function reuseRefusal(metres: unknown): string | null {
  if (typeof metres !== 'number' || !Number.isFinite(metres) || metres < 0)
    return 'reuseMetres is not a distance of zero or more'
  return metres > MAX_REUSE_METRES ? `reuseMetres is over ${String(MAX_REUSE_METRES)} m` : null
}

/**
 * The live anchor nearest a position, within a distance.
 * @param doc - the document
 * @param cells - the live anchors near the positions, by cell
 * @param position - the position
 * @param metres - the distance
 * @returns the anchor's index, or `null` when none lies so near
 */
function nearestLive(
  doc: YearDocument,
  cells: SpatialCells<number>,
  position: Position,
  metres: number
): number | null {
  const kmLon = kmPerDegreeOfLongitude(position[1])
  const kmLat = kmPerDegreeOfLatitude()
  let best: number | null = null
  let bestKm = metres / 1000
  for (const index of cells.near(position)) {
    const anchor = doc.anchors[index]
    if (anchor === undefined) continue
    const km = Math.hypot((anchor[0] - position[0]) * kmLon, (anchor[1] - position[1]) * kmLat)
    if (km <= bestKm) {
      best = index
      bestKm = km
    }
  }
  return best
}

/**
 * The live anchors a position may be, filed by cell (`geo/spatialCells`, as the paste's weld does): those near the
 * positions, the excluded left out.
 * @param doc - the document
 * @param positions - the positions, one at least
 * @param metres - how near an anchor a position is that anchor, above zero
 * @param excluded - anchors a position may not be
 * @returns the cells
 */
function liveCells(
  doc: YearDocument,
  positions: readonly Position[],
  metres: number,
  excluded: ReadonlySet<number>
): SpatialCells<number> {
  const km = metres / 1000
  const box = paddedBox(positions, km)
  const cells = new SpatialCells<number>(box, km)
  for (const index of referencedAnchors(doc)) {
    const anchor = doc.anchors[index]
    if (anchor !== undefined && !excluded.has(index) && inGeoBox(anchor, box))
      cells.addPoint(index, anchor)
  }
  return cells
}

/**
 * The outline points of some positions: a live anchor within the distance is that anchor, by its index; any other
 * position a new point under the provenance given. A distance of zero reuses nothing.
 * @param doc - the document
 * @param positions - the positions, all finite
 * @param metres - how near an anchor a position is that anchor
 * @param provenance - a new point's
 * @param excluded - anchors a position may not be — the stretch a run replaces, its two ends
 * @returns the points, and how many are existing anchors
 */
function scriptedPoints(
  doc: YearDocument,
  positions: readonly Position[],
  metres: number,
  provenance: Provenance,
  excluded: ReadonlySet<number> = new Set()
): { points: OutlinePoint[]; reused: number } {
  const cells =
    metres > 0 && positions.length > 0 ? liveCells(doc, positions, metres, excluded) : null
  let reused = 0
  const points = positions.map((position): OutlinePoint => {
    const anchor = cells === null ? null : nearestLive(doc, cells, position, metres)
    if (anchor === null) return { at: [position[0], position[1]], provenance }
    reused++
    const at = doc.anchors[anchor] ?? position
    return { at: [at[0], at[1]], provenance, anchor }
  })
  return { points, reused }
}

/**
 * The outline points of some positions, checked: the distance of reuse readable, no anchor named twice.
 * @param doc - the document
 * @param positions - the positions, all finite
 * @param provenance - a new point's
 * @param options - the distance of reuse
 * @param excluded - anchors a position may not be
 * @returns the points and how many are existing anchors, or why they cannot be laid
 */
function checkedPoints(
  doc: YearDocument,
  positions: readonly Position[],
  provenance: Provenance,
  options: ScriptedOptions,
  excluded: ReadonlySet<number> = new Set()
): { points: OutlinePoint[]; reused: number } | string {
  const metres = options.reuseMetres ?? REUSE_METRES
  const refusal = reuseRefusal(metres)
  if (refusal !== null) return refusal
  const laid = scriptedPoints(doc, positions, metres, provenance, excluded)
  return holdsAnAnchorTwice(laid.points) ? 'two positions are one anchor' : laid
}

/**
 * Whether two positions are one anchor — a ring or a run that would hold it twice, a figure of eight the Pen never
 * lays (review ARCH-002).
 * @param points - the points
 * @returns `true` when an anchor is named twice
 */
function holdsAnAnchorTwice(points: readonly OutlinePoint[]): boolean {
  const named = points.flatMap((point) => (typeof point.anchor === 'number' ? [point.anchor] : []))
  return new Set(named).size !== named.length
}

/**
 * Why a ring's positions cannot be laid, or `null` when they can.
 * @param doc - the document
 * @param polityId - whose ring
 * @param positions - the ring
 * @returns the refusal, or `null`
 */
function ringRefusal(
  doc: YearDocument,
  polityId: string,
  positions: readonly Position[]
): string | null {
  if (!doc.polities.some((polity) => polity.id === polityId))
    return `no polity "${polityId}" on this map`
  if (positions.length < 3) return 'a ring needs three positions at least'
  if (!allFinite(positions)) return 'a position is not two finite numbers'
  if (ringCrossesItself(positions)) return 'the ring crosses itself'
  const open = openSuzerainOf(doc, polityId)
  if (open !== null) return `its suzerain "${open}" has an open outline: it could not be carved`
  return null
}

/**
 * Close a ring for a polity from its positions, as the Pen closes one: reused anchors, new points, then the carving of
 * a vassal out of its suzerain's own domain, with an anchor where limits cross.
 * @param doc - the document to edit
 * @param polityId - whose ring
 * @param positions - `[longitude, latitude]`, three at least, the first not repeated at the end
 * @param provenance - a new point's provenance — the Pen's « reported by eye »
 * @param options - how near an anchor a position is that anchor
 * @returns what was done, or why nothing was
 */
export function placeScriptedRing(
  doc: YearDocument,
  polityId: string,
  positions: readonly Position[],
  provenance: Provenance,
  options: ScriptedOptions = {}
): ScriptedAnswer {
  const refusal = ringRefusal(doc, polityId, positions)
  if (refusal !== null) return refused(refusal)
  const laid = checkedPoints(doc, positions, provenance, options)
  if (typeof laid === 'string') return refused(laid)
  const { points, reused } = laid
  const drawn = addOutlineCarving(doc, polityId, points)
  if (!drawn.closed) return refused('the document refused the ring')
  const ring = doc.claims.find((claim) => claim.polity === polityId)?.rings.at(-1) ?? []
  return {
    ok: true,
    ring: [...ring],
    reused,
    created: positions.length - reused,
    ...carvingAnswer(drawn.carving),
  }
}

/**
 * What a closing's carving says in the answer: the suzerain carved and the crossings placed, or why it was not
 * carved — the ring stays closed then, as the Pen's does, and the overlap is the author's to correct.
 * @param carving - what the carving answered, `null` when there was nothing to carve
 * @returns the answer's carving fields
 */
function carvingAnswer(
  carving: Carving | CarvingFault | CarvingHeld | null
): Pick<ScriptedAnswer, 'carved' | 'crossings' | 'refusal'> {
  if (carving === null) return { carved: null, crossings: 0 }
  if ('crossings' in carving) return { carved: carving.suzerain, crossings: carving.crossings }
  const why = 'reason' in carving ? carving.reason : 'its outline is open'
  return { carved: null, crossings: 0, refusal: `not carved out of "${carving.suzerain}": ${why}` }
}

/**
 * The stretch a polity's ring runs between two anchors: the way round with **fewer anchors** — not the shorter on the
 * ground, as the Pen's retrace counts — or the only one on an open outline; the stretch replaced is in the answer, for a
 * script to check.
 * @param doc - the document
 * @param polityId - whose ring
 * @param from - one anchor
 * @param to - the other
 * @returns the anchors strictly between them from `from`, `null` when no ring of the polity holds both, or `tie` when
 *   both ways are as long
 */
function shorterArc(
  doc: YearDocument,
  polityId: string,
  from: number,
  to: number
): number[] | 'tie' | null {
  const arcs = retraceArcs(doc, polityId, from, to)
  if (arcs === null) return null
  if (arcs.only === 'forward') return arcs.forward
  if (arcs.only === 'backward') return arcs.backward
  if (arcs.forward.length === arcs.backward.length) return 'tie'
  return arcs.forward.length < arcs.backward.length ? arcs.forward : arcs.backward
}

/**
 * The polities whose rings hold two anchors.
 * @param doc - the document
 * @param from - one anchor
 * @param to - the other
 * @returns their ids, each once
 */
function holdersOf(doc: YearDocument, from: number, to: number): string[] {
  return [
    ...new Set(
      everyOutline(doc.claims).flatMap(({ ring, polity }) =>
        ring.includes(from) && ring.includes(to) ? [polity] : []
      )
    ),
  ]
}

/**
 * Whether a ring's stretch is the one decided.
 * @param arc - the ring's shorter arc, `shorterArc`'s
 * @param replaced - the stretch decided
 * @returns `true` when they hold the same anchors in the same order
 */
function sameStretch(arc: number[] | 'tie' | null, replaced: readonly number[]): boolean {
  if (!Array.isArray(arc) || arc.length !== replaced.length) return false
  return arc.every((index, at) => index === replaced[at])
}

/**
 * The polities whose rings decide the stretch: the one named, or every one holding both anchors.
 * @param holders - the polities holding both anchors
 * @param named - the polity the caller named, if any
 * @returns the deciders, or why there are none
 */
function decidersOf(holders: readonly string[], named: string | undefined): string[] | string {
  if (holders.length === 0) return 'no ring holds both anchors'
  if (named === undefined) return [...holders]
  return holders.includes(named) ? [named] : `no ring of "${named}" holds both anchors`
}

/**
 * The stretch a run replaces, decided: the polity named, or every polity holding both anchors agreeing on it.
 * @param doc - the document
 * @param from - one anchor
 * @param to - the other
 * @param named - the polity the caller named, if any
 * @returns the polity and the stretch, or why it cannot be decided
 */
function decidedStretch(
  doc: YearDocument,
  from: number,
  to: number,
  named: string | undefined
): { polity: string; replaced: number[] } | string {
  const holders = holdersOf(doc, from, to)
  const deciders = decidersOf(holders, named)
  if (typeof deciders === 'string') return deciders
  const arcs = deciders.map((polity) => ({ polity, arc: shorterArc(doc, polity, from, to) }))
  const [first] = arcs
  const replaced = first?.arc ?? null
  if (first === undefined || replaced === null) return 'no ring holds both anchors'
  if (replaced === 'tie')
    return `both ways round "${first.polity}" are as long: no stretch to choose`
  if (arcs.some(({ arc }) => !sameStretch(arc, replaced)))
    return `the rings of ${holders.join(', ')} run differently between the anchors: name the polity`
  return { polity: first.polity, replaced }
}

/**
 * Replace the stretch between two anchors by a run of positions, in every ring that runs over it — the border two
 * neighbours share moved as one (the retrace).
 * @param doc - the document to edit
 * @param from - the anchor the run starts on
 * @param to - the anchor it ends on
 * @param positions - the run, strictly between `from` and `to`, in that order
 * @param provenance - a new point's provenance
 * @param options - how near an anchor a position is that anchor; whose ring decides the stretch
 * @returns what was done, or why nothing was
 */
export function replaceScriptedRun(
  doc: YearDocument,
  from: number,
  to: number,
  positions: readonly Position[],
  provenance: Provenance,
  options: ScriptedOptions = {}
): ScriptedAnswer {
  const live = referencedAnchors(doc)
  if (!live.has(from) || !live.has(to)) return refused('an end is no live anchor')
  if (from === to) return refused('the two ends are one anchor')
  if (!allFinite(positions)) return refused('a position is not two finite numbers')
  const stretch = decidedStretch(doc, from, to, options.polity)
  if (typeof stretch === 'string') return refused(stretch)
  const laid = checkedPoints(
    doc,
    positions,
    provenance,
    options,
    new Set([from, to, ...stretch.replaced])
  )
  if (typeof laid === 'string') return refused(laid)
  const { points, reused } = laid
  const firstNew = doc.anchors.length
  const done = retraceStretch(doc, stretch.polity, from, to, stretch.replaced, points)
  if (isRetraceRefusal(done)) return refused(`the retrace refused it: ${done.kind}`)
  let next = firstNew
  const run = points.map((point) => (typeof point.anchor === 'number' ? point.anchor : next++))
  return {
    ok: true,
    ring: [from, ...run, to],
    replaced: [...stretch.replaced],
    reused,
    created: positions.length - reused,
    carved: null,
    crossings: 0,
  }
}
