import { openRings, outlineFloor, setRingOpen } from '../data/outlines'

import { edgeAt, everyRing, runStepAt } from './anchorEdits'
import { moveAnchor } from './documentEdits'

import type { YearDocument } from '../data/yearDocument'

/*
 * Welding — making two outlines that only coincide **share** their points (`H-37`, the dev, 2026-10-14:
 * *« ça donne la frontière, ça fusionne les points »*). An anchor moved onto a neighbour's sits on it
 * without sharing an index: the second geometry `s00` forbids, a sliver at the first move of either.
 *
 * Two gestures, one rule — after them, one index is held by every ring that runs there:
 *
 * - **onto an anchor**: the dragged anchor is replaced by the neighbour's everywhere it is held;
 * - **onto a stretch**: the dragged anchor is put on the neighbour's stretch and threaded into every ring
 *   that runs over it, as an inserted point would be — so the neighbour gains it.
 *
 * Both check every ring before they write, so a refusal leaves the document as it was. A dressed run
 * (`s13`) is a hand-set stroke, not an outline: it never refuses a weld — it follows when it can, and when it
 * cannot it is kept as it was, orphaned in {Overrides}, as `removeAnchors` keeps one (never dropped silently).
 */

/** What a weld or a thread did: the polities whose rings now hold the anchor. */
export interface WeldDone {
  /** The polities whose rings hold the surviving anchor, in claim order. */
  polities: string[]
}

/** Why a weld was refused — nothing was written. */
export interface WeldRefusal {
  /**
   * `'pinch'`: a ring already held the anchor welded onto — or, threading, the anchor threaded — elsewhere:
   * it would visit one point twice;
   * `'collapse'`: a ring would be left with fewer anchors than its floor — three closed, two open.
   */
  refused: 'pinch' | 'collapse'
}

/**
 * A dressed run with one anchor replaced by another, consecutive repeats dropped — or the run as it was
 * when the welded one would hold fewer than two anchors or pass twice through `into`: the file refuses a run
 * under two, and dropping it would undo a hand-set stroke silently (`s13`).
 * @param run - the run's anchors, open
 * @param from - the anchor replaced
 * @param into - the anchor it becomes
 * @returns the run to keep
 */
function weldedRun(run: readonly number[], from: number, into: number): number[] {
  const replaced = run.map((at) => (at === from ? into : at))
  const kept = replaced.filter((at, i) => i === 0 || at !== replaced[i - 1])
  const valid = kept.length >= 2 && kept.filter((at) => at === into).length <= 1
  return valid ? kept : [...run]
}

/**
 * The polities whose claim holds one of the rings given.
 * @param doc - the document to read
 * @param rings - the rings, by identity
 * @returns their ids, in claim order
 */
function holdersOf(doc: YearDocument, rings: readonly number[][]): string[] {
  return doc.claims
    .filter((claim) => claim.rings.some((ring) => rings.includes(ring)))
    .map((claim) => claim.polity)
}

/**
 * Whether a weld's answer is a refusal.
 * @param result - what `weldAnchor` returned
 * @returns `true` when nothing was written
 */
export function isWeldRefusal(result: WeldDone | WeldRefusal): result is WeldRefusal {
  return 'refused' in result
}

/** A ring with an anchor welded, and whether the weld closed it. */
interface Welded {
  /** The new ring. */
  ring: number[]
  /** Whether an open outline was closed — one end welded onto the other, as Illustrator joins two ends. */
  closes: boolean
}

/**
 * A ring with one anchor replaced by another, consecutive repeats dropped — the closing pair included for a closed
 * ring. **An open outline whose two ends meet is closed** (`open-outlines.md`): its last anchor, now its first, is
 * dropped, and the line between them becomes its closing segment — never a segment lost in silence.
 * @param ring - the ring's anchors
 * @param from - the anchor replaced
 * @param into - the anchor it becomes
 * @param open - whether the ring is an open outline
 * @returns the new ring, and whether it closed
 */
function welded(ring: readonly number[], from: number, into: number, open: boolean): Welded {
  const replaced = ring.map((at) => (at === from ? into : at))
  const kept = replaced.filter((at, i) => i === 0 || at !== replaced[i - 1])
  const ends = kept.length > 1 && kept[0] === kept.at(-1)
  if (ends) kept.pop()
  return { ring: kept, closes: open && ends }
}

/**
 * The polities whose rings hold an anchor.
 * @param doc - the document to read
 * @param index - the anchor
 * @returns their ids, in claim order
 */
function holders(doc: YearDocument, index: number): string[] {
  return doc.claims
    .filter((claim) => claim.rings.some((ring) => ring.includes(index)))
    .map((claim) => claim.polity)
}

/** A ring a weld touches: the ring itself, whether it is open, and what the weld makes of it. */
interface WeldPlan extends Welded {
  /** The ring, live. */
  live: number[]
  /** Whether it is an open outline. */
  open: boolean
}

/**
 * What a weld makes of each ring holding the anchor dragged, nothing written yet.
 * @param doc - the document
 * @param rings - the rings holding `from`, live
 * @param from - the anchor dragged
 * @param into - the anchor it is dropped on
 * @returns one plan per ring
 */
function weldPlans(
  doc: YearDocument,
  rings: readonly number[][],
  from: number,
  into: number
): WeldPlan[] {
  const opened = openRings(doc.claims)
  return rings.map((live) => {
    const open = opened.has(live)
    return { live, open, ...welded(live, from, into, open) }
  })
}

/**
 * Mark closed every open outline a weld joined end to end.
 * @param doc - the document
 * @param plans - the weld's plans
 */
function closeJoined(doc: YearDocument, plans: readonly WeldPlan[]): void {
  for (const { live, closes } of plans) {
    if (!closes) continue
    for (const claim of doc.claims) {
      const at = claim.rings.indexOf(live)
      if (at >= 0) setRingOpen(claim, at, false)
    }
  }
}

/**
 * Weld one anchor onto another: `from` is replaced by `into` in every ring, deliberate gap and dressed
 * run that holds it, so the two outlines share that point from now on. `from` stays in the table, held by
 * nothing, and leaves the file at save as every unreferenced anchor does.
 * @param doc - the document to edit
 * @param from - the anchor dragged
 * @param into - the anchor it is dropped on
 * @returns the polities now holding `into`, a refusal, or `null` when `from` is held by no ring, either is
 *   not an anchor, or they are the same — and then nothing was written
 */
export function weldAnchor(
  doc: YearDocument,
  from: number,
  into: number
): WeldDone | WeldRefusal | null {
  if (from === into || doc.anchors[from] === undefined || doc.anchors[into] === undefined)
    return null
  const rings = everyRing(doc).filter((ring) => ring.includes(from))
  if (rings.length === 0) return null
  const plans = weldPlans(doc, rings, from, into)
  if (plans.some(({ ring }) => ring.filter((at) => at === into).length > 1))
    return { refused: 'pinch' }
  // An open outline stands on two points, a closed ring on three — and one the weld closes is closed (open-outlines.md).
  if (plans.some(({ ring, open, closes }) => ring.length < outlineFloor(open && !closes))) {
    return { refused: 'collapse' }
  }
  closeJoined(doc, plans)
  for (const { live, ring } of plans) live.splice(0, live.length, ...ring)
  for (const dressed of doc.runs) dressed.run = weldedRun(dressed.run, from, into)
  return { polities: holders(doc, into) }
}

/**
 * Put an anchor on another outline's stretch and thread it into every ring that runs over that stretch
 * — the neighbour gains the point, as if it had been inserted there, and keeps it shared from now on.
 * @param doc - the document to edit
 * @param index - the anchor dragged
 * @param a - one end of the stretch
 * @param b - the other end
 * @param point - where on the stretch, `[longitude, latitude]`
 * @returns the polities whose rings gained the anchor; `'pinch'` when a ring running from `a` to `b`
 *   already holds it elsewhere — threading would make it visit the point twice, and skipping it would leave
 *   the very sliver a weld removes; or `null` when no ring runs from `a` to `b`, or the anchor is one of the
 *   two ends — and then nothing was written
 */
export function threadAnchor(
  doc: YearDocument,
  index: number,
  a: number,
  b: number,
  point: [number, number]
): WeldDone | WeldRefusal | null {
  if (index === a || index === b || doc.anchors[index] === undefined) return null
  const open = openRings(doc.claims)
  const edge = (ring: readonly number[]) => edgeAt(ring, a, b, open.has(ring))
  const rings = everyRing(doc).filter((ring) => edge(ring) >= 0)
  if (rings.length === 0) return null
  if (rings.some((ring) => ring.includes(index))) return { refused: 'pinch' }
  moveAnchor(doc, index, point)
  for (const ring of rings) ring.splice(edge(ring) + 1, 0, index)
  // A hand-set stroke over that stretch keeps covering all of it (s13).
  for (const dressed of doc.runs) {
    const at = runStepAt(dressed.run, a, b)
    if (at >= 0 && !dressed.run.includes(index)) dressed.run.splice(at + 1, 0, index)
  }
  return { polities: holdersOf(doc, rings) }
}
