/**
 * Erasing an edge — the line between two anchors — from every outline that draws it (CARTO-397, the dev, 2026-11-08:
 * *"il faudrait qu'on puisse enlever un trait entre deux points"*).
 *
 * **No anchor goes, only the line between two.** A closed outline erased at one edge becomes an open outline running
 * from one end of the edge round to the other (`open-outlines.md`); an open outline erased at one of its edges is cut
 * in two, and a piece left with a single anchor is nothing and goes (the open floor is two).
 *
 * **An edge two polities share leaves both** (the dev, same evening: *"pour une arête partagée, les deux pays à la
 * fois … c'est spécialement pour les lacs"*): on screen it is one line, and a lake crossed by a border is opened on
 * both sides at once, each polity then closing its own shore.
 */

import { isRingOpen, outlineFloor, ringSegments } from '../data/outlines'

import type { YearDocument } from '../data/yearDocument'
import type { YearClaim } from '../data/yearFormat'

/** What an erasure did — for the result zone, and for a test to read. */
export interface EdgeErasure {
  /** The polities whose outlines lost the edge, in claim order. */
  polities: string[]
  /** How many closed outlines it opened. */
  opened: number
  /** How many open outlines it cut in two. */
  cut: number
  /** How many pieces of a cut it left with a single anchor, and removed — the other piece kept. */
  dropped: number
  /**
   * How many open outlines it removed whole: erasing the only edge of a two-anchor outline leaves two single anchors,
   * nothing an outline can be (review QUAL-002). Said, never silent.
   */
  removed: number
}

/**
 * Where an outline runs along the edge `a`–`b`, either way: the position of the edge's first anchor, or -1.
 * @param ring - the outline's anchors
 * @param open - whether it is open (its ends are joined by no edge)
 * @param a - one anchor of the edge
 * @param b - the other
 * @returns the position `i` such that the edge is `ring[i]`–`ring[i + 1]`, or -1
 */
export function edgePosition(ring: readonly number[], open: boolean, a: number, b: number): number {
  // The one walk of an outline's segments (`ringSegments`), so the line joining an open outline's ends is never one.
  return ringSegments(ring, open).findIndex(
    ([from, to]) => (from === a && to === b) || (from === b && to === a)
  )
}

/**
 * One outline with the edge at `at` erased: a closed one becomes one open outline from the anchor after the edge
 * round to the anchor before it; an open one becomes the pieces either side, each kept with two anchors at least.
 * @param ring - the outline's anchors
 * @param open - whether it is open
 * @param at - the edge's position, from {@link edgePosition}
 * @returns the open outlines that replace it, and how many single-anchor pieces were left out
 */
export function openAt(
  ring: readonly number[],
  open: boolean,
  at: number
): { pieces: number[][]; dropped: number } {
  if (!open) return { pieces: [[...ring.slice(at + 1), ...ring.slice(0, at + 1)]], dropped: 0 }
  const sides = [ring.slice(0, at + 1), ring.slice(at + 1)]
  const pieces = sides.filter((piece) => piece.length >= outlineFloor(true))
  return { pieces, dropped: sides.length - pieces.length }
}

/**
 * Erase an edge from one claim's outlines, rebuilding its rings and its open positions together.
 * @param claim - the claim, edited in place
 * @param a - one anchor of the edge
 * @param b - the other
 * @returns how many outlines it opened, cut or removed, and how many pieces it dropped — all zero when none drew the
 *   edge
 */
function eraseFromClaim(
  claim: YearClaim,
  a: number,
  b: number
): { opened: number; cut: number; dropped: number; removed: number } {
  // Rebuilt here rather than through `keepRings`, which maps one ring to one: a cut turns one ring into two.
  const rings: number[][] = []
  const open: number[] = []
  let opened = 0
  let cut = 0
  let dropped = 0
  let removed = 0
  claim.rings.forEach((ring, position) => {
    const wasOpen = isRingOpen(claim, position)
    const at = edgePosition(ring, wasOpen, a, b)
    if (at < 0) {
      if (wasOpen) open.push(rings.length)
      rings.push(ring)
      return
    }
    const result = openAt(ring, wasOpen, at)
    if (!wasOpen) opened += 1
    else if (result.pieces.length === 0) removed += 1
    else {
      cut += 1
      dropped += result.dropped
    }
    for (const piece of result.pieces) {
      open.push(rings.length)
      rings.push(piece)
    }
  })
  if (opened + cut + removed === 0) return { opened, cut, dropped, removed }
  claim.rings = rings
  if (open.length === 0) delete claim.open
  else claim.open = open
  return { opened, cut, dropped, removed }
}

/**
 * Erase the edge between two anchors from every outline drawing it, whoever holds it.
 * @param document - the document, edited in place
 * @param a - one anchor of the edge
 * @param b - the other
 * @returns what it did, or `null` when no outline draws that edge — and nothing changed
 */
export function eraseEdge(document: YearDocument, a: number, b: number): EdgeErasure | null {
  if (a === b) return null
  const erasure: EdgeErasure = { polities: [], opened: 0, cut: 0, dropped: 0, removed: 0 }
  for (const claim of document.claims) {
    const done = eraseFromClaim(claim, a, b)
    if (done.opened + done.cut + done.removed === 0) continue
    erasure.polities.push(claim.polity)
    erasure.opened += done.opened
    erasure.cut += done.cut
    erasure.dropped += done.dropped
    erasure.removed += done.removed
  }
  return erasure.polities.length === 0 ? null : erasure
}
