/**
 * A polity's **extent**: its own domain plus the extent of each of its vassals, recursively (the dev,
 * 2026-10-15). A suzerain need not hold a ring of its own — the Empire can be nothing but its duchies — and
 * it still has territory.
 *
 * Computed from the registry, never drawn: what is drawn is each polity's own domain. Overlap between them is
 * allowed while the author corrects by hand, so nothing here assumes the members are disjoint.
 */

import { vassalsOf } from '../data/paintOrder'
import { pointInRings } from '../geo/pointInRing'

import { chainBorderRuns } from './borderGraph'
import { MIN_RING_ANCHORS } from './yearDocument'

import type { BorderEdge } from './borderGraph'
import type { YearDocument } from './yearDocument'

/**
 * The polities whose drawn domain makes up a polity's extent: itself, then its vassals at any depth.
 * @param doc - the document
 * @param id - whose extent
 * @returns the ids, the polity first
 */
export function extentMembers(doc: YearDocument, id: string): string[] {
  return [id, ...vassalsOf(doc.polities, id)]
}

/**
 * Whether a polity's extent holds any ground — a ring of its own, or one of a vassal at any depth.
 * @param doc - the document
 * @param id - whose extent
 * @returns `true` when something of the extent is drawn
 */
export function hasExtent(doc: YearDocument, id: string): boolean {
  const members = new Set(extentMembers(doc, id))
  return doc.claims.some((claim) => members.has(claim.polity) && claim.rings.length > 0)
}

/**
 * How far either side of a segment its two sides are asked, as a fraction of its length. Tiny on purpose:
 * the far-side step of the derivation (0.05°) once crossed a channel into an island; a step this short
 * cannot cross anything the segment does not border.
 */
const SIDE_STEP = 1e-3

/**
 * The outline of a polity's extent: every segment of a member's ring with the extent on **one side only**.
 *
 * A limit between two members — France against Aquitaine, Aquitaine against Normandy — has the extent on
 * both sides and drops out; so does a stretch of France's own ring still lying under Aquitaine while the
 * author corrects it. A coast, or the limit against Castile, has it on one side and stays. One test covers
 * all of them, shared anchors or not.
 * @param doc - the document
 * @param id - whose extent
 * @returns the outline as runs of anchor indices, each a chain of consecutive segments
 */
export function extentOutline(doc: YearDocument, id: string): number[][] {
  const members = new Set(extentMembers(doc, id))
  const memberClaims = doc.claims
    .filter((claim) => members.has(claim.polity))
    .map((claim) =>
      boxed(
        claim.rings.map((ring) =>
          ring
            .map((index) => doc.anchors[index])
            .filter((anchor): anchor is [number, number] => anchor !== undefined)
        )
      )
    )
  // The box first (review QUAL-002, 2026-10-15): a member far from the point is skipped without walking its
  // rings, as `derivedBorders` does for the far side.
  const inExtent = (point: [number, number]): boolean =>
    memberClaims.some(
      ({ rings, box }) =>
        point[0] >= box.west &&
        point[0] <= box.east &&
        point[1] >= box.south &&
        point[1] <= box.north &&
        pointInRings(point, rings)
    )

  const kept = new Map<string, BorderEdge>()
  for (const claim of doc.claims) {
    if (!members.has(claim.polity)) continue
    for (const ring of claim.rings) {
      if (ring.length < MIN_RING_ANCHORS) continue
      ring.forEach((from, at) => {
        const to = ring[(at + 1) % ring.length]
        if (to === undefined || to === from) return
        const low = Math.min(from, to)
        const high = Math.max(from, to)
        const key = `${String(low)}:${String(high)}`
        if (kept.has(key) || !onOutline(doc.anchors[from], doc.anchors[to], inExtent)) return
        kept.set(key, { low, high, owners: [id] })
      })
    }
  }
  return chainBorderRuns(kept).map(({ run }) => run)
}

/** A member's rings resolved to coordinates, and the box around them. */
interface BoxedRings {
  /** Its rings, as `[lon, lat]`. */
  rings: [number, number][][]
  /** The box around every ring: a point outside it is outside the member. */
  box: { west: number; east: number; south: number; north: number }
}

/**
 * Put a box around resolved rings.
 * @param rings - the rings, as `[lon, lat]`
 * @returns the rings and their box
 */
function boxed(rings: [number, number][][]): BoxedRings {
  const box = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity }
  for (const ring of rings)
    for (const [lon, lat] of ring) {
      box.west = Math.min(box.west, lon)
      box.east = Math.max(box.east, lon)
      box.south = Math.min(box.south, lat)
      box.north = Math.max(box.north, lat)
    }
  return { rings, box }
}

/**
 * Whether a segment has the extent on exactly one side.
 * @param a - one end, `[lon, lat]`
 * @param b - the other
 * @param inExtent - whether a point lies in the extent
 * @returns `true` when the segment bounds the extent
 */
function onOutline(
  a: [number, number] | undefined,
  b: [number, number] | undefined,
  inExtent: (point: [number, number]) => boolean
): boolean {
  if (a === undefined || b === undefined) return false
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const nx = -(b[1] - a[1]) * SIDE_STEP
  const ny = (b[0] - a[0]) * SIDE_STEP
  if (nx === 0 && ny === 0) return false
  return inExtent([mid[0] + nx, mid[1] + ny]) !== inExtent([mid[0] - nx, mid[1] - ny])
}
