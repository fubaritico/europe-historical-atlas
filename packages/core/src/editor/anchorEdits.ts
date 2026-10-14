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
export function everyRing(doc: YearDocument): number[][] {
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
export function edgeAt(ring: readonly number[], a: number, b: number): number {
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
export function runStepAt(run: readonly number[], a: number, b: number): number {
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
  /**
   * How many of the owner's rings went whole — every anchor of theirs removed, or too few left to enclose
   * an area (`removeAnchors`).
   */
  rings: number
  /**
   * The other polities whose outline kept the points, because losing them would have left it under
   * {@link MIN_RING_ANCHORS} — a neighbour's outline is never deleted by a gesture on the owner's points.
   */
  spared: string[]
}

/**
 * Remove an anchor from every ring that holds it; its two stretches merge into one.
 * @param doc - the document to edit
 * @param index - the anchor to remove
 * @returns the polities that held it, or `null` when no claim holds it
 */
export function removeAnchor(doc: YearDocument, index: number): AnchorRemoval | null {
  return removeAnchors(doc, [index])
}

/**
 * Remove several anchors from every ring that holds them — `s03`'s *"delete several at once … in one
 * undo step"* — and, **for the polity named as owner, every ring all of whose anchors are removed goes
 * whole**: selecting all the points of an outline and deleting them deletes the outline, as in Illustrator
 * (the dev, 2026-10-14, on the night's degenerate islands of Denmark — defect 11 of the general test).
 * **A ring deleted whole leaves its anchors to the neighbours that share them**: the list of indices goes,
 * the points stay with whoever else holds them, so a country with a land border can be deleted without its
 * neighbour losing a point. A polity left with no ring has no claim, the normal state of a polity with no
 * territory. **Another polity's ring never goes whole**, even covered: the tools select the owner's points,
 * and deleting a neighbour's outline unsaid would be the inverse defect.
 *
 * **Nothing refuses a deletion** (the dev, 2026-10-14: *« y'a rien qui doit m'empêcher d'enlever des
 * points. Rien. »*). A ring left under {@link MIN_RING_ANCHORS} cannot enclose an area and would vanish
 * silently on the next open (`s03`), so it never stays: **an owner's ring that would fall short goes
 * whole**, as if all its points had been selected; **another polity's, or a deliberate gap's, keeps the
 * points** it would have lost, and is named in `spared`. The anchors stay in the table, as every anchor
 * does while editing; nothing holding them, they leave the file at save.
 * @param doc - the document to edit
 * @param indices - the anchors to remove
 * @param owner - the polity whose rings may go whole, or none
 * @returns the polities that held any of them, how many rings went whole and who kept the points, or
 *   `null` when nothing was removed — no ring holds any of them, or every one touched kept its points
 */
export function removeAnchors(
  doc: YearDocument,
  indices: readonly number[],
  owner?: string
): AnchorRemoval | null {
  const selected = new Set(indices)
  // Whole, or too few points left to enclose an area: either way the owner's ring goes.
  const goesWhole = (ring: readonly number[]) =>
    ring.filter((at) => !selected.has(at)).length < MIN_RING_ANCHORS
  const ownerRings = new Set(
    doc.claims.find((claim) => claim.polity === owner)?.rings.filter(goesWhole) ?? []
  )
  // A ring deleted whole leaves its anchors to whoever else holds them — a neighbour along a shared border
  // keeps its outline (review ARCH-001, 2026-10-14). Only the anchors selected outside such a ring leave the
  // other rings.
  const inWhole = new Set([...ownerRings].flat())
  const gone = new Set(indices.filter((index) => !inWhole.has(index)))
  const touches = (ring: readonly number[]) => ring.some((at) => gone.has(at))
  // Any other ring that would fall short keeps its points: it is not this gesture's to delete.
  const spares = (ring: number[]) =>
    !ownerRings.has(ring) && ring.filter((at) => !gone.has(at)).length < MIN_RING_ANCHORS
  const holding = doc.claims.filter((claim) =>
    claim.rings.some((ring) => ownerRings.has(ring) || touches(ring))
  )
  if (holding.length === 0) return null
  // Every ring touched keeping its points — no owner named — is nothing done: no step to record.
  const changes =
    ownerRings.size > 0 || everyRing(doc).some((ring) => touches(ring) && !spares(ring))
  if (!changes) return null
  const spared = holding
    .filter((claim) => claim.rings.some((ring) => touches(ring) && spares(ring)))
    .map((claim) => claim.polity)
  const thinned = (ring: number[]): number[] =>
    spares(ring) ? [...ring] : ring.filter((at) => !gone.has(at))
  for (const claim of holding) {
    claim.rings = claim.rings.filter((ring) => !ownerRings.has(ring)).map(thinned)
  }
  // Only a claim this gesture emptied goes (ARCH-003): an untouched one is not this gesture's to edit.
  doc.claims = doc.claims.filter((claim) => !holding.includes(claim) || claim.rings.length > 0)
  for (const gap of doc.deliberateGaps) gap.ring = thinned(gap.ring)
  // A dressed run loses the points too, so it runs over the merged stretch. One left with a single
  // anchor is kept as it was: the file refuses a run under two, and dropping it would undo a hand-set
  // stroke silently (s13) — it shows in {Overrides} as orphaned instead.
  for (const dressed of doc.runs) {
    const kept = dressed.run.filter((at) => !gone.has(at))
    if (kept.length >= 2) dressed.run = kept
  }
  return { polities: holding.map((claim) => claim.polity), rings: ownerRings.size, spared }
}
