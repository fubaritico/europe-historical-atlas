import { addAnchor, declareSource } from './documentEdits'
import { MIN_RING_ANCHORS } from './yearDocument'

import type { Provenance } from './documentEdits'
import type { YearDocument } from './yearDocument'

/**
 * Inserting and removing one anchor — `s03`'s *"insert an anchor"* and *"delete an anchor"*, the white
 * arrow's two point operations beside moving.
 *
 * **Both act on every ring at once**, and that is the whole of `H-06` again: a stretch two polities share
 * is one pair of anchors in both rings, so a point inserted into it goes into both, and a point removed
 * from it leaves both. Inserting into one ring only would open the sliver at the first move.
 *
 * **"Every ring" counts the deliberate gaps too** (QUAL-001): a gap's ring borders the claims around it
 * on the same anchors, so a point inserted on that stretch goes into the gap as well, and a deletion that
 * would leave a gap under three anchors is refused like any ring — the save would drop it silently.
 * **And a dressed run follows** (ARCH-101): it gains a point inserted on a stretch it covers, and loses
 * one removed from it, so a hand-set stroke keeps lying on the border it was set on.
 */

/**
 * Every ring in the document that borders something: each claim's, then each deliberate gap's.
 * @param doc - the document to read
 * @returns the rings, live — splicing one edits the document
 */
function everyRing(doc: YearDocument): number[][] {
  return [
    ...doc.claims.flatMap((claim) => claim.rings),
    ...doc.deliberateGaps.map((gap) => gap.ring),
  ]
}

/**
 * The position of the stretch joining two anchors in a ring, either way round, the closing one included.
 * @param ring - the ring's anchor indices, closure implied
 * @param a - one anchor
 * @param b - the other
 * @returns the position after which the new anchor goes, or `-1` when they are not neighbours
 */
function edgeAt(ring: readonly number[], a: number, b: number): number {
  for (let at = 0; at < ring.length; at += 1) {
    const next = ring[(at + 1) % ring.length]
    const here = ring[at]
    if ((here === a && next === b) || (here === b && next === a)) return at
  }
  return -1
}

/**
 * Where a dressed run steps from one anchor to the other — a run is open, so no wrap.
 * @param run - the run's anchors, in order
 * @param a - one anchor
 * @param b - the other
 * @returns the position after which the new anchor goes, or `-1`
 */
function runStepAt(run: readonly number[], a: number, b: number): number {
  for (let at = 0; at + 1 < run.length; at += 1) {
    const here = run[at]
    const next = run[at + 1]
    if ((here === a && next === b) || (here === b && next === a)) return at
  }
  return -1
}

/**
 * Insert a new anchor on the stretch between two anchors, in every ring that runs over that stretch.
 * @param doc - the document to edit
 * @param a - one end of the stretch
 * @param b - the other end
 * @param point - where the new anchor goes, `[longitude, latitude]`
 * @param provenance - what it is reported from
 * @returns the new anchor's index, or `null` when no ring runs from `a` to `b` — and nothing was written
 */
export function insertAnchorOnStretch(
  doc: YearDocument,
  a: number,
  b: number,
  point: [number, number],
  provenance: Provenance
): number | null {
  const rings = everyRing(doc).filter((ring) => edgeAt(ring, a, b) >= 0)
  if (rings.length === 0) return null
  const index = addAnchor(doc, point, declareSource(doc, provenance))
  for (const ring of rings) ring.splice(edgeAt(ring, a, b) + 1, 0, index)
  // A hand-set stroke over that stretch keeps covering all of it (s13).
  for (const dressed of doc.runs) {
    const at = runStepAt(dressed.run, a, b)
    if (at >= 0) dressed.run.splice(at + 1, 0, index)
  }
  return index
}

/** What removing an anchor touched, for the status bar. */
export interface AnchorRemoval {
  /** The polities whose rings held it — two or more for a shared border. */
  polities: string[]
}

/**
 * Remove an anchor from every ring that holds it; its two stretches merge into one.
 * @param doc - the document to edit
 * @param index - the anchor to remove
 * @returns the polities that held it, or `null` when no claim holds it or a ring would fall too short
 */
export function removeAnchor(doc: YearDocument, index: number): AnchorRemoval | null {
  return removeAnchors(doc, [index])
}

/**
 * Remove several anchors from every ring that holds them — `s03`'s *"delete several at once … in one
 * undo step"*.
 *
 * **All or nothing, checked before anything is written**: refused when a ring would fall under
 * {@link MIN_RING_ANCHORS} once they are all gone — `s03`, a ring that cannot enclose an area would
 * vanish silently on the next open. Removing them one by one and stopping at the first refusal would
 * leave the document changed with no step to undo it. The anchors stay in the table, as every anchor
 * does while editing; nothing holding them, they leave the file at save.
 * @param doc - the document to edit
 * @param indices - the anchors to remove
 * @returns the polities that held any of them, or `null` when none is held or a ring would fall short
 */
export function removeAnchors(doc: YearDocument, indices: readonly number[]): AnchorRemoval | null {
  const gone = new Set(indices)
  const touches = (ring: readonly number[]) => ring.some((at) => gone.has(at))
  const holding = doc.claims.filter((claim) => claim.rings.some(touches))
  if (holding.length === 0) return null
  const tooShort = everyRing(doc).some(
    (ring) => touches(ring) && ring.filter((at) => !gone.has(at)).length < MIN_RING_ANCHORS
  )
  if (tooShort) return null
  for (const claim of holding) {
    claim.rings = claim.rings.map((ring) => ring.filter((at) => !gone.has(at)))
  }
  for (const gap of doc.deliberateGaps) gap.ring = gap.ring.filter((at) => !gone.has(at))
  // A dressed run loses the points too, so it runs over the merged stretch. One left with a single
  // anchor is kept as it was: the file refuses a run under two, and dropping it would undo a hand-set
  // stroke silently (s13) — it shows in {Overrides} as orphaned instead.
  for (const dressed of doc.runs) {
    const kept = dressed.run.filter((at) => !gone.has(at))
    if (kept.length >= 2) dressed.run = kept
  }
  return { polities: holding.map((claim) => claim.polity) }
}
