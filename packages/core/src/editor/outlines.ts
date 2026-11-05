/**
 * Open and closed outlines — the one place a claim's `open` positions are read and kept in step with its rings
 * (`files/plans/cartographer/open-outlines.md`, the dev, 2026-11-05: *"an outline must be allowed not to be closed"*).
 *
 * **An open outline counts as closed for an area** — its fill, inclusion, its name's pole — by a straight line between
 * its two ends, as Illustrator fills an open path. **It has no closing segment for a line**: no border is derived
 * along that straight line, no point is inserted on it, and a run along the outline goes one way only.
 *
 * The positions drift only where a ring is removed or rebuilt, so every writer that does either goes through
 * {@link keepRings} or {@link setRingOpen}; `documentFaults` says a position that names no ring.
 */

import { CLOSED_RING_FLOOR, OPEN_RING_FLOOR } from '../data/ringFloors'

import type { YearClaim } from '../data/yearFormat'

/**
 * Whether one of a claim's rings is open.
 * @param claim - the claim, or a copied polity — what holds the open positions
 * @param claim.open - the positions of its open rings
 * @param at - the ring's position in it
 * @returns `true` when the author left it open
 */
export function isRingOpen(
  claim: { readonly open?: readonly number[] | undefined },
  at: number
): boolean {
  return claim.open?.includes(at) ?? false
}

/**
 * The fewest anchors an outline holds: a triangle closed, a line open.
 * @param open - whether the outline is open
 * @returns the floor
 */
export function outlineFloor(open: boolean): number {
  return open ? OPEN_RING_FLOOR : CLOSED_RING_FLOOR
}

/**
 * Mark one ring open or closed. The key is removed when no ring is open, so a claim with every ring closed is
 * written as it always was.
 * @param claim - the claim, edited in place
 * @param at - the ring's position
 * @param open - whether it is open
 */
export function setRingOpen(claim: YearClaim, at: number, open: boolean): void {
  const others = (claim.open ?? []).filter((each) => each !== at)
  const next = open ? [...others, at].sort((a, b) => a - b) : others
  if (next.length === 0) delete claim.open
  else claim.open = next
}

/**
 * Keep some of a claim's rings, in order, renumbering the open positions with them.
 * @param claim - the claim, edited in place
 * @param keep - whether the ring at a position stays
 * @param map - what a kept ring becomes; the ring itself by default
 */
export function keepRings(
  claim: YearClaim,
  keep: (ring: number[], at: number, open: boolean) => boolean,
  map: (ring: number[], at: number) => number[] = (ring) => ring
): void {
  const rings: number[][] = []
  const open: number[] = []
  claim.rings.forEach((ring, at) => {
    const isOpen = isRingOpen(claim, at)
    if (!keep(ring, at, isOpen)) return
    if (isOpen) open.push(rings.length)
    rings.push(map(ring, at))
  })
  claim.rings = rings
  if (open.length === 0) delete claim.open
  else claim.open = open
}

/**
 * Add a ring to a claim, open or closed.
 * @param claim - the claim, edited in place
 * @param ring - the ring's anchors; held, not copied
 * @param open - whether it is open
 */
export function pushRing(claim: YearClaim, ring: number[], open: boolean): void {
  claim.rings.push(ring)
  if (open) setRingOpen(claim, claim.rings.length - 1, true)
}

/**
 * The segments of an outline, as positions of their first anchor: every one closed, all but the closing one open.
 * @param ring - the outline's anchors
 * @param open - whether it is open
 * @returns how many segments it has
 */
export function segmentCount(ring: readonly number[], open: boolean): number {
  if (ring.length < 2) return 0
  return open ? ring.length - 1 : ring.length
}

/** A ring with whether it is open and whose it is — what a segment reader walks. */
export interface OutlineOf {
  /** The ring, live: an edit to it edits the document. */
  ring: number[]
  /** Whether it is open. */
  open: boolean
  /** The polity holding it. */
  polity: string
}

/**
 * Every claimed outline, live, with whether it is open.
 * @param claims - the document's claims
 * @returns the outlines, in claim order
 */
export function everyOutline(claims: readonly YearClaim[]): OutlineOf[] {
  return claims.flatMap((claim) =>
    claim.rings.map((ring, at) => ({ ring, open: isRingOpen(claim, at), polity: claim.polity }))
  )
}

/**
 * Whether a ring is open, found by identity among the claims — for a reader handed a live ring without its claim.
 * @param claims - the document's claims
 * @param ring - the ring, by identity
 * @returns `true` when the claim holding it marks it open; `false` for a ring no claim holds (a declared gap)
 */
export function isOpenRing(claims: readonly YearClaim[], ring: readonly number[]): boolean {
  for (const claim of claims) {
    const at = claim.rings.indexOf(ring as number[])
    if (at >= 0) return isRingOpen(claim, at)
  }
  return false
}

/**
 * Every open outline of the claims, by identity — built once per operation, so a reader walking every ring asks a set
 * rather than scanning every claim for each ring (review QUAL-006, 2026-11-05). **Built per call, never kept**: an edit
 * that replaces a ring array (`keepRings`) changes the identity it is keyed by.
 * @param claims - the document's claims
 * @returns the open rings
 */
export function openRings(claims: readonly YearClaim[]): ReadonlySet<readonly number[]> {
  const open = new Set<readonly number[]>()
  for (const claim of claims) {
    for (const at of claim.open ?? []) {
      const ring = claim.rings[at]
      if (ring !== undefined) open.add(ring)
    }
  }
  return open
}

/**
 * The segments of an outline, as pairs of anchors in its order — the closing one included for a closed ring, never
 * for an open outline. **The one walk** every reader of an outline's segments goes through (review QUAL-002,
 * 2026-11-05), so no reader can join an open outline's two ends.
 * @param ring - the outline's anchors
 * @param open - whether it is open
 * @returns its segments
 */
export function ringSegments(ring: readonly number[], open: boolean): [number, number][] {
  const segments: [number, number][] = []
  for (let at = 0; at < segmentCount(ring, open); at += 1) {
    const a = ring[at]
    const b = ring[(at + 1) % ring.length]
    if (a !== undefined && b !== undefined) segments.push([a, b])
  }
  return segments
}

/**
 * The anchors on either side of a position of an outline — one only at an open outline's end.
 * @param ring - the outline's anchors
 * @param at - the position
 * @param open - whether it is open
 * @returns the anchors before and after it, the missing one left out
 */
export function ringNeighboursAt(ring: readonly number[], at: number, open: boolean): number[] {
  const n = ring.length
  const before = open && at === 0 ? undefined : ring[(at - 1 + n) % n]
  const after = open && at === n - 1 ? undefined : ring[(at + 1) % n]
  return [before, after].filter((index): index is number => index !== undefined)
}
