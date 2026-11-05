/**
 * Pasting a stretch onto a polity of the map (CARTO-345, `s22` « # 2 », the dev, 2026-11-05: *"you paste, there is
 * nothing, it takes the place; you paste, there is something, we weld"*).
 *
 * - **A whole outline** (a closed stretch) becomes **one more ring** of the polity, welded onto the map at the weld
 *   distance as a pasted polity's rings are — onto a polity with nothing drawn it is its outline; onto one already
 *   drawn the two rings overlap, and that is seen (the dev: no outline replacement, no hybrid case).
 * - **A part of an outline** (an open stretch) is **merged into the polity's outline**: its two ends hook onto the
 *   nearest anchors of one of its rings, and the stretch between them is replaced — ⟨retracer⟩ fed by the clipboard
 *   (`retrace.ts`), the smaller change as it chooses (`geo/retraceSide.ts`), a neighbour running over the whole
 *   replaced stretch following. Its points arrive at their coordinates, under their sources.
 *
 * **Nothing is written on a refusal**: every check is made before the first write.
 */

import { groundKm } from '../geo/groundDistance'
import { smallerSide } from '../geo/retraceSide'

import { addOutline } from './documentEdits'
import { weldPastedRings } from './pasteWeld'
import { isRetraceRefusal, retraceArcs, retraceStretch } from './retrace'

import type { CopiedStretch } from './clipboard'
import type { OutlinePoint } from './documentEdits'
import type { RetraceRefusal } from './retrace'
import type { YearDocument } from './yearDocument'

/** What pasting a stretch did, for the status bar. */
export type StretchPasted =
  /** A whole outline, added as one more ring of the polity. */
  | {
      /** What was done. */
      kind: 'ring'
      /** How many points the outline brought. */
      points: number
      /** How many of them took a point of the map. */
      welded: number
    }
  /** A part of an outline, merged into the polity's own. */
  | {
      /** What was done. */
      kind: 'merged'
      /** How many points the stretch brought, its two ends included. */
      points: number
      /** How many anchors of the polity's outline it replaced. */
      removed: number
      /** The other polities whose outline took the stretch too. */
      neighbours: string[]
    }

/** Why a stretch was not pasted — nothing was written. */
export type StretchPasteRefusal =
  /** The polity aimed at is not in the map: the selection and the map disagree. */
  | { refused: 'no-polity' }
  /** A part of an outline onto a polity with nothing drawn: there is nothing to hook it onto. */
  | { refused: 'no-outline' }
  /** An end lies farther than the weld distance from every ring of the polity — `km`, the farther end's distance. */
  | { refused: 'too-far'; km: number }
  /** Both ends hook onto the same anchor: there is no stretch between them to replace. */
  | { refused: 'same-end' }
  /** ⟨retracer⟩ refuses the merge — a border dressed by hand over it, a ring left too short, a loop. */
  | { refused: 'retrace'; why: RetraceRefusal }

/**
 * Whether a stretch's paste was refused.
 * @param answer - what {@link pasteStretch} returned
 * @returns `true` when nothing was written
 */
export function isStretchPasteRefusal(
  answer: StretchPasted | StretchPasteRefusal
): answer is StretchPasteRefusal {
  return 'refused' in answer
}

/** The two anchors of a polity's ring a stretch's ends hook onto, and how far the farther end is. */
interface Hooks {
  /** The anchor the first point hooks onto. */
  from: number
  /** The anchor the last point hooks onto. */
  to: number
  /** The farther end's distance to its anchor, in kilometres. */
  km: number
}

/**
 * The anchor of a ring nearest a point.
 * @param doc - the map
 * @param ring - the ring
 * @param point - `[longitude, latitude]`
 * @returns the anchor and its distance, or `null` for a ring with no anchor in the table
 */
function nearestOnRing(
  doc: YearDocument,
  ring: readonly number[],
  point: readonly [number, number]
): { anchor: number; km: number } | null {
  let best: { anchor: number; km: number } | null = null
  for (const anchor of ring) {
    const at = doc.anchors[anchor]
    if (at === undefined) continue
    const km = groundKm(point, at)
    if (best === null || km < best.km) best = { anchor, km }
  }
  return best
}

/**
 * Where a stretch's two ends hook onto a polity's outline: on the ring whose anchors lie nearest both ends.
 * @param doc - the map
 * @param rings - the polity's rings
 * @param first - the stretch's first point
 * @param last - its last point
 * @returns the two anchors and the farther end's distance, or `null` when no ring holds an anchor
 */
function hooksOn(
  doc: YearDocument,
  rings: readonly number[][],
  first: readonly [number, number],
  last: readonly [number, number]
): Hooks | null {
  let best: Hooks | null = null
  for (const ring of rings) {
    const start = nearestOnRing(doc, ring, first)
    const end = nearestOnRing(doc, ring, last)
    if (start === null || end === null) continue
    const km = Math.max(start.km, end.km)
    if (best === null || km < best.km) best = { from: start.anchor, to: end.anchor, km }
  }
  return best
}

/**
 * An anchor's position.
 * @param doc - the map
 * @param index - the anchor
 * @returns its `[longitude, latitude]`
 * @throws when the index is past the table — every index read here comes from the polity's own rings
 */
function positionOf(doc: YearDocument, index: number): [number, number] {
  const at = doc.anchors[index]
  if (at === undefined) throw new Error(`[Cartographer] anchor ${String(index)} is not in the map.`)
  return at
}

/**
 * Merge a part of an outline into a polity's outline: its ends hooked, the stretch between them replaced.
 * @param doc - the map, edited in place
 * @param stretch - the stretch, open
 * @param polityId - the polity it is pasted onto
 * @param rings - the polity's rings, one at least
 * @param weldKm - how far an end may lie from the outline it hooks onto
 * @returns what was done, or why nothing was
 */
function mergeStretch(
  doc: YearDocument,
  stretch: CopiedStretch,
  polityId: string,
  rings: readonly number[][],
  weldKm: number
): StretchPasted | StretchPasteRefusal {
  const first = stretch.points[0]
  const last = stretch.points.at(-1)
  if (first === undefined || last === undefined || stretch.points.length < 2) {
    throw new Error('[Cartographer] a stretch of fewer than two points cannot be pasted.')
  }
  const hooks = hooksOn(doc, rings, first.at, last.at)
  if (hooks === null) return { refused: 'no-outline' }
  if (hooks.km > weldKm) return { refused: 'too-far', km: hooks.km }
  if (hooks.from === hooks.to) return { refused: 'same-end' }
  const arcs = retraceArcs(doc, polityId, hooks.from, hooks.to)
  if (arcs === null) return { refused: 'retrace', why: { kind: 'no-ring' } }

  const between: OutlinePoint[] = stretch.points
    .slice(1, -1)
    .map((point) => ({ at: point.at, provenance: point.provenance }))
  const ends = (run: readonly number[]): [number, number][] => [
    positionOf(doc, hooks.from),
    ...run.map((index) => positionOf(doc, index)),
    positionOf(doc, hooks.to),
  ]
  const run: [number, number][] = [
    positionOf(doc, hooks.from),
    ...between.map((point): [number, number] => [point.at[0], point.at[1]]),
    positionOf(doc, hooks.to),
  ]
  const side = smallerSide(run, ends(arcs.forward), ends(arcs.backward))
  const replaced = side === 'forward' ? arcs.forward : arcs.backward
  const done = retraceStretch(doc, polityId, hooks.from, hooks.to, replaced, between)
  if (isRetraceRefusal(done)) return { refused: 'retrace', why: done }
  return {
    kind: 'merged',
    points: stretch.points.length,
    removed: done.removed,
    neighbours: done.neighbours,
  }
}

/**
 * Paste a stretch onto a polity of the map — a whole outline as one more ring of it, a part of an outline merged
 * into its outline.
 * @param doc - the map, edited in place
 * @param stretch - the stretch from the clipboard
 * @param polityId - the polity selected in the map
 * @param weldKm - the weld distance, `PASTE_WELD_KM` in the application: a whole outline welds onto the map within it,
 *   a part's two ends must lie within it of the polity's outline
 * @returns what was done, or why nothing was
 * @throws when a whole outline's ring is refused by the document once welded — a defect: it is long enough, the
 *   polity is in the map and its anchors are the map's
 */
export function pasteStretch(
  doc: YearDocument,
  stretch: CopiedStretch,
  polityId: string,
  weldKm: number
): StretchPasted | StretchPasteRefusal {
  if (!doc.polities.some((polity) => polity.id === polityId)) return { refused: 'no-polity' }
  const rings = doc.claims.find((claim) => claim.polity === polityId)?.rings ?? []
  if (!stretch.closed) {
    return rings.length === 0
      ? { refused: 'no-outline' }
      : mergeStretch(doc, stretch, polityId, rings, weldKm)
  }
  const [welded] = weldPastedRings(doc, [stretch.points], weldKm)
  if (welded === undefined || !addOutline(doc, polityId, welded.points)) {
    throw new Error(`[Cartographer] the document refused the outline pasted onto "${polityId}".`)
  }
  return { kind: 'ring', points: stretch.points.length, welded: welded.welded }
}
