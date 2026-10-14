import { edgeAt, everyRing, runStepAt } from './anchorEdits'
import { moveAnchor } from './documentEdits'
import { MIN_RING_ANCHORS } from './yearDocument'

import type { YearDocument } from './yearDocument'

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
 * Both check before they write, so a refusal leaves the document as it was.
 */

/** What a weld or a thread did: the polities whose rings now hold the anchor. */
export interface WeldDone {
  /** The polities whose rings hold the surviving anchor, in claim order. */
  polities: string[]
}

/** Why a weld was refused — nothing was written. */
export interface WeldRefusal {
  /**
   * `'pinch'`: a ring already held the anchor welded onto, elsewhere — it would visit one point twice;
   * `'collapse'`: a ring would be left with fewer than {@link MIN_RING_ANCHORS} anchors.
   */
  refused: 'pinch' | 'collapse'
}

/**
 * Whether a weld's answer is a refusal.
 * @param result - what `weldAnchor` returned
 * @returns `true` when nothing was written
 */
export function isWeldRefusal(result: WeldDone | WeldRefusal): result is WeldRefusal {
  return 'refused' in result
}

/**
 * A ring with one anchor replaced by another, consecutive repeats dropped — the closing pair included.
 * @param ring - the ring's anchors, closure implied
 * @param from - the anchor replaced
 * @param into - the anchor it becomes
 * @returns the new ring
 */
function welded(ring: readonly number[], from: number, into: number): number[] {
  const replaced = ring.map((at) => (at === from ? into : at))
  const kept = replaced.filter((at, i) => i === 0 || at !== replaced[i - 1])
  if (kept.length > 1 && kept[0] === kept.at(-1)) kept.pop()
  return kept
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
  const next = rings.map((ring) => welded(ring, from, into))
  if (next.some((ring) => ring.filter((at) => at === into).length > 1)) return { refused: 'pinch' }
  if (next.some((ring) => ring.length < MIN_RING_ANCHORS)) return { refused: 'collapse' }
  rings.forEach((ring, i) => ring.splice(0, ring.length, ...(next[i] ?? ring)))
  for (const dressed of doc.runs) {
    const run = dressed.run.map((at) => (at === from ? into : at))
    dressed.run = run.filter((at, i) => i === 0 || at !== run[i - 1])
  }
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
 * @returns the polities now holding the anchor, or `null` when no ring that lacks it runs from `a` to
 *   `b`, or it is one of the two ends — and then nothing was written
 */
export function threadAnchor(
  doc: YearDocument,
  index: number,
  a: number,
  b: number,
  point: [number, number]
): WeldDone | null {
  if (index === a || index === b || doc.anchors[index] === undefined) return null
  const rings = everyRing(doc).filter((ring) => !ring.includes(index) && edgeAt(ring, a, b) >= 0)
  if (rings.length === 0) return null
  moveAnchor(doc, index, point)
  for (const ring of rings) ring.splice(edgeAt(ring, a, b) + 1, 0, index)
  // A hand-set stroke over that stretch keeps covering all of it (s13).
  for (const dressed of doc.runs) {
    const at = runStepAt(dressed.run, a, b)
    if (at >= 0 && !dressed.run.includes(index)) dressed.run.splice(at + 1, 0, index)
  }
  return { polities: holders(doc, index) }
}
