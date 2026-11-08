/**
 * Pasting points onto a polity of the map (CARTO-345, `files/plans/cartographer/open-outlines.md`, the dev,
 * 2026-11-05: *"it must copy the points and carry them over"*).
 *
 * The points come sorted into pieces (`clipboard.ts`); each is put down in the clipboard's order, the lot one step of
 * the history:
 *
 * - **A whole closed outline** becomes **one more outline** of the polity, welded onto the map at the weld distance as
 *   a pasted polity's are — onto a polity with nothing drawn it is its outline; onto one already drawn the two overlap,
 *   and that is seen (the dev, 2026-11-05: no outline replacement).
 * - **A piece that is not closed** is **merged into the polity's outline**: each end hooks onto **the nearest point**
 *   of one of its outlines, however far (the dev: *"you take the nearest point to merge it with"*), and the stretch
 *   between them is replaced — ⟨retracer⟩ fed by the clipboard (`retrace.ts`), the smaller change as it chooses
 *   (`geo/retraceSide.ts`), a neighbour running over the whole replaced stretch following.
 * - **Onto a polity with nothing drawn**, a piece that is not closed has nothing to merge into: it becomes an **open
 *   outline** of the polity, to be resumed with the Pen.
 * - **A piece hooked onto the two ends of an open outline closes it**, as Illustrator joins two ends — rather than
 *   replacing everything between them.
 *
 * **A piece ⟨retracer⟩ refuses is left out and named** — a border dressed by hand over the stretch, an outline left too
 * short, a loop — and the others are pasted; every check is made before that piece writes (my choice, 2026-11-05, to
 * confirm with the dev).
 */

import { isRingOpen, setRingOpen } from '../data/outlines'
import { MIN_RING_ANCHORS } from '../data/yearDocument'
import { groundKm } from '../geo/groundDistance'
import { smallerSide } from '../geo/retraceSide'

import { carveOutOfSuzerain, openSuzerainOf } from './carve'
import { addOutline, anchorsFor } from './documentEdits'
import { weldPastedRings } from './pasteWeld'
import { isRetraceRefusal, retraceArcs, retraceStretch } from './retrace'

import type { Carving, CarvingFault, CarvingHeld } from './carve'
import type { CopiedPiece, CopiedPoints } from './clipboard'
import type { OutlinePoint } from './documentEdits'
import type { RetraceRefusal } from './retrace'
import type { YearDocument } from '../data/yearDocument'
import type { YearClaim } from '../data/yearFormat'

/** What pasting points did, for the status bar. */
export interface PointsPasted {
  /** How many whole outlines were added. */
  outlines: number
  /** How many pieces became open outlines — onto a polity with nothing drawn. */
  open: number
  /** How many pieces were merged into the polity's outline. */
  merged: number
  /** How many points were put down. */
  points: number
  /** How many of them took a point of the map. */
  welded: number
  /** The other polities whose outline took a merged piece too, each once. */
  neighbours: string[]
  /** Why each piece left out was, in the clipboard's order. */
  leftOut: PieceRefusal[]
  /** What carving answered for each open outline a piece closed — done, or held back by an open suzerain. */
  carved: (Carving | CarvingHeld)[]
}

/**
 * Why one piece was left out: ⟨retracer⟩'s refusal, or the piece would close a vassal whose suzerain's outline is still
 * open — `suzerain`, its id.
 */
export type PieceRefusal = RetraceRefusal | { kind: 'suzerain-open'; suzerain: string }

/** Why no point was pasted — nothing was written. */
export interface PointsPasteRefusal {
  /** The polity aimed at is not in the map: the selection and the map disagree. */
  refused: 'no-polity'
}

/**
 * Whether a paste of points was refused whole.
 * @param answer - what {@link pastePoints} returned
 * @returns `true` when nothing was written
 */
export function isPointsPasteRefusal(
  answer: PointsPasted | PointsPasteRefusal
): answer is PointsPasteRefusal {
  return 'refused' in answer
}

/** An anchor of an outline and its distance to a point. */
interface Nearest {
  /** The anchor. */
  anchor: number
  /** How far, in kilometres. */
  km: number
}

/**
 * The anchor of an outline nearest a point, one anchor excepted.
 * @param doc - the map
 * @param ring - the outline
 * @param point - `[longitude, latitude]`
 * @param except - an anchor not to choose, or `null`
 * @returns the anchor and its distance, or `null` when the outline holds no other anchor
 */
function nearestOnRing(
  doc: YearDocument,
  ring: readonly number[],
  point: readonly [number, number],
  except: number | null
): Nearest | null {
  let best: Nearest | null = null
  for (const anchor of ring) {
    const at = doc.anchors[anchor]
    if (at === undefined || anchor === except) continue
    const km = groundKm(point, at)
    if (best === null || km < best.km) best = { anchor, km }
  }
  return best
}

/** The two anchors of one outline a piece's ends hook onto. */
interface Hooks {
  /** The anchor the first point hooks onto. */
  from: number
  /** The anchor the last point hooks onto — never the same as {@link from}. */
  to: number
}

/**
 * Where a piece's two ends hook onto a polity's outline: on the outline whose points lie nearest both ends, each end on
 * its nearest point — the last on the nearest other than the first's, so there is a stretch between them.
 * @param doc - the map
 * @param rings - the polity's outlines
 * @param first - the piece's first point
 * @param last - its last point
 * @returns the two anchors, or `null` when no outline holds two anchors
 */
function hooksOn(
  doc: YearDocument,
  rings: readonly number[][],
  first: readonly [number, number],
  last: readonly [number, number]
): Hooks | null {
  let best: (Hooks & { km: number }) | null = null
  for (const ring of rings) {
    const start = nearestOnRing(doc, ring, first, null)
    const end = start === null ? null : nearestOnRing(doc, ring, last, start.anchor)
    if (start === null || end === null) continue
    const km = Math.max(start.km, end.km)
    if (best === null || km < best.km) best = { from: start.anchor, to: end.anchor, km }
  }
  return best === null ? null : { from: best.from, to: best.to }
}

/**
 * An anchor's position.
 * @param doc - the map
 * @param index - the anchor
 * @returns its `[longitude, latitude]`
 * @throws when the index is past the table — every index read here comes from the polity's own outlines
 */
function positionOf(doc: YearDocument, index: number): [number, number] {
  const at = doc.anchors[index]
  if (at === undefined) throw new Error(`[Cartographer] anchor ${String(index)} is not in the map.`)
  return at
}

/**
 * When a piece's ends hook onto the two ends of an open outline, the piece **closes** it — its points laid between the
 * last anchor and the first, the outline marked closed — rather than replacing everything between the two ends, the
 * one way an open outline otherwise offers (Illustrator joins two ends the same way).
 * @param doc - the map, edited in place when the piece closes the outline
 * @param polityId - the polity pasted onto
 * @param ring - the outline both hooks lie on, found by identity among the polity's
 * @param hooks - the two anchors the piece's ends hook onto
 * @param between - the piece's points between its ends
 * @returns the outline, live, when it closed it; `null` otherwise
 */
function closesOpenOutline(
  doc: YearDocument,
  polityId: string,
  ring: readonly number[],
  hooks: Hooks,
  between: readonly OutlinePoint[]
): number[] | null {
  const held = openRingOf(doc, polityId, ring)
  const way = endsJoined(ring, hooks)
  // Closed, it must enclose something: a line of two anchors closed by nothing between them stays open.
  if (held === null || way === null || ring.length + between.length < MIN_RING_ANCHORS) return null
  const { claim, at, live } = held
  const forward = way === 'forward'
  const laid = anchorsFor(doc, forward ? between : [...between].reverse())
  if (laid === null) return null
  live.push(...laid)
  setRingOpen(claim, at, false)
  return live
}

/**
 * Whether one of a polity's outlines, found by identity, is open.
 * @param doc - the map
 * @param polityId - the polity
 * @param ring - the outline
 * @returns `true` when it is
 */
function isOpen(doc: YearDocument, polityId: string, ring: readonly number[]): boolean {
  return openRingOf(doc, polityId, ring) !== null
}

/**
 * A polity's open outline, found by identity, with its claim and position.
 * @param doc - the map
 * @param polityId - the polity
 * @param ring - the outline
 * @returns where it lies, or `null` when it is not an open outline of the polity
 */
function openRingOf(
  doc: YearDocument,
  polityId: string,
  ring: readonly number[]
): { claim: YearClaim; at: number; live: number[] } | null {
  const claim = doc.claims.find((each) => each.polity === polityId)
  const at = claim?.rings.findIndex((each) => each === ring) ?? -1
  const live = claim?.rings[at]
  return claim === undefined || live === undefined || !isRingOpen(claim, at)
    ? null
    : { claim, at, live }
}

/**
 * Whether a piece's hooks are an outline's two ends, and which way: from its last to its first, or the reverse.
 * @param ring - the outline
 * @param hooks - the anchors the piece's ends hook onto
 * @returns the way, or `null` when the hooks are not its two ends
 */
function endsJoined(ring: readonly number[], hooks: Hooks): 'forward' | 'backward' | null {
  if (hooks.from === ring.at(-1) && hooks.to === ring[0]) return 'forward'
  if (hooks.from === ring[0] && hooks.to === ring.at(-1)) return 'backward'
  return null
}

/** What merging one piece did. */
interface Merged {
  /** How many anchors of the polity's outline it replaced. */
  removed: number
  /** The other polities whose outline took it too. */
  neighbours: string[]
  /** What carving the suzerain answered, when the piece closed an open outline — as the Pen's closing does. */
  carving: Carving | CarvingFault | CarvingHeld | null
}

/**
 * Where a piece's ends hook onto a polity's outline.
 * @param doc - the map
 * @param piece - the piece
 * @param polityId - the polity
 * @returns the two anchors, or `null` when the piece has no ends or no outline holds two anchors
 */
function pieceHooks(doc: YearDocument, piece: CopiedPiece, polityId: string): Hooks | null {
  const first = piece.points[0]
  const last = piece.points.at(-1)
  const rings = doc.claims.find((claim) => claim.polity === polityId)?.rings ?? []
  return first && last ? hooksOn(doc, rings, first.at, last.at) : null
}

/**
 * Merge a piece into a polity's outline: its ends hooked on the nearest points, the stretch between them replaced.
 * @param doc - the map, edited in place
 * @param piece - the piece, not closed
 * @param polityId - the polity it is pasted onto, with something drawn
 * @returns what was done, or why ⟨retracer⟩ refused it — and then nothing was written
 */
function mergePiece(
  doc: YearDocument,
  piece: CopiedPiece,
  polityId: string
): Merged | PieceRefusal {
  const hooks = pieceHooks(doc, piece, polityId)
  // No outline of the polity holds two anchors: there is no stretch to merge into.
  if (hooks === null) return { kind: 'no-ring' }
  const arcs = retraceArcs(doc, polityId, hooks.from, hooks.to)
  if (arcs === null) return { kind: 'no-ring' }

  const between: OutlinePoint[] = piece.points
    .slice(1, -1)
    .map((point) => ({ at: point.at, provenance: point.provenance }))
  // A piece that would close a vassal over a suzerain still open is left out, nothing written (the dev, 2026-11-05).
  const suzerain = openSuzerainOf(doc, polityId)
  if (
    suzerain !== null &&
    endsJoined(arcs.ring, hooks) !== null &&
    isOpen(doc, polityId, arcs.ring)
  ) {
    return { kind: 'suzerain-open', suzerain }
  }
  const closed = closesOpenOutline(doc, polityId, arcs.ring, hooks, between)
  // Closed by a paste as by the Pen: a vassal's outline carves its suzerain (review ARCH-003, 2026-11-05).
  if (closed !== null) {
    return { removed: 0, neighbours: [], carving: carveOutOfSuzerain(doc, polityId, closed) }
  }
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
  // On an open outline there is one way between two anchors; on a closed one, the smaller change.
  const side = arcs.only ?? smallerSide(run, ends(arcs.forward), ends(arcs.backward))
  const replaced = side === 'forward' ? arcs.forward : arcs.backward
  const done = retraceStretch(doc, polityId, hooks.from, hooks.to, replaced, between)
  if (isRetraceRefusal(done)) return done
  return { removed: done.removed, neighbours: done.neighbours, carving: null }
}

/**
 * Paste points onto a polity of the map, piece by piece.
 * @param doc - the map, edited in place
 * @param copied - the points from the clipboard
 * @param polityId - the polity selected in the map
 * @param weldKm - the weld distance, `PASTE_WELD_KM` in the application: an outline added welds onto the map within it
 * @returns what was done, the pieces left out named; or why nothing was
 * @throws when an outline is refused by the document once welded — a defect: it holds its floor of points, the polity
 *   is in the map and its anchors are the map's
 */
export function pastePoints(
  doc: YearDocument,
  copied: CopiedPoints,
  polityId: string,
  weldKm: number
): PointsPasted | PointsPasteRefusal {
  if (!doc.polities.some((polity) => polity.id === polityId)) return { refused: 'no-polity' }
  const drawn = doc.claims.some((claim) => claim.polity === polityId && claim.rings.length > 0)
  // What is added whole — every closed outline, and every piece when nothing is drawn — is welded onto the map before
  // the paste, read once, so the pieces never weld onto one another.
  const added = copied.pieces.filter((piece) => piece.closed || !drawn)
  const merged = copied.pieces.filter((piece) => !piece.closed && drawn)
  const done: PointsPasted = {
    outlines: 0,
    open: 0,
    merged: 0,
    points: 0,
    welded: 0,
    neighbours: [],
    leftOut: [],
    carved: [],
  }
  const welds = weldPastedRings(
    doc,
    added.map((piece) => piece.points),
    weldKm,
    added.map((piece) => !piece.closed)
  )
  added.forEach((piece, at) => {
    const welded = welds[at]
    if (welded === undefined || !addOutline(doc, polityId, welded.points, !piece.closed)) {
      throw new Error(`[Cartographer] the document refused an outline pasted onto "${polityId}".`)
    }
    if (piece.closed) done.outlines += 1
    else done.open += 1
    done.points += piece.points.length
    done.welded += welded.welded
  })
  for (const piece of merged) mergeInto(doc, piece, polityId, done)
  return done
}

/**
 * Merge one piece and count it in what the paste did — or name it left out.
 * @param doc - the map, edited in place
 * @param piece - the piece, not closed
 * @param polityId - the polity pasted onto
 * @param done - what the paste did so far, added to
 */
function mergeInto(
  doc: YearDocument,
  piece: CopiedPiece,
  polityId: string,
  done: PointsPasted
): void {
  const answer = mergePiece(doc, piece, polityId)
  if ('kind' in answer) {
    done.leftOut.push(answer)
    return
  }
  done.merged += 1
  done.points += piece.points.length
  if (answer.carving !== null && 'reason' in answer.carving) {
    console.error(
      `[Cartographer] the outline of "${polityId}" was closed but not carved out of "${answer.carving.suzerain}": ${answer.carving.reason}; they overlap.`
    )
  } else if (answer.carving !== null) done.carved.push(answer.carving)
  for (const name of answer.neighbours) {
    if (!done.neighbours.includes(name)) done.neighbours.push(name)
  }
}
