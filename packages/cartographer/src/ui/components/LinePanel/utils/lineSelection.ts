import { coveringRun, segmentKey } from '@europe-historical-atlas/core/data/borderOverrides'
import { isRingOpen, ringSegments, segmentCount } from '@europe-historical-atlas/core/data/outlines'

import type { Segment } from '@europe-historical-atlas/core/data/borderOverrides'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * What `{Line}` reads of a selection (`s13`, *one marquee, two things to do with it*): the segments
 * between the white arrow's selected anchors, whom they separate, and how they are dressed now.
 *
 * Pure, so the panel is a view over it and every rule here is exercised with a literal.
 */

/** A selection, read for `{Line}`. */
export interface LineSelection {
  /** The segments between consecutive selected anchors of the target's rings. */
  segments: Segment[]
  /**
   * The one neighbour every selected segment is shared with — what *"the whole border"* means — or `null`
   * when the segments run against several, or against nobody.
   */
  neighbour: string | null
  /** The hand every selected segment carries by a run override, `null` when none carries one. */
  hand: string | null
  /** Whether the segments carry different hands — then `hand` is `null` and no pattern reads as chosen. */
  mixed: boolean
}

/**
 * The segments of the target's rings whose two ends are both selected — the ring's closing segment
 * included.
 * @param doc - the document
 * @param target - the polity the arrow acts on
 * @param selected - the selected anchors
 * @returns the segments, in ring order
 */
export function selectedSegments(
  doc: YearDocument,
  target: string,
  selected: readonly number[]
): Segment[] {
  const chosen = new Set(selected)
  const out: Segment[] = []
  const seen = new Set<string>()
  for (const claim of doc.claims) {
    if (claim.polity !== target) continue
    for (const [position, ring] of claim.rings.entries())
      ring.forEach((a, at) => {
        // An open outline's two ends are joined by no segment to dress (open-outlines.md).
        if (at >= segmentCount(ring, isRingOpen(claim, position))) return
        const b = ring[(at + 1) % ring.length]
        if (b === undefined || !chosen.has(a) || !chosen.has(b) || a === b) return
        const key = segmentKey(a, b)
        if (seen.has(key)) return
        seen.add(key)
        out.push([a, b])
      })
  }
  return out
}

/**
 * Every polity but one, by the segments its rings hold — read once per selection, so asking a segment costs a
 * lookup rather than a walk of the whole map (the dev, 2026-11-05: Venice's 461 points selected took 1 133 ms to
 * read, every segment walking every ring of the map).
 * @param doc - the document
 * @param except - the polity left out — the target
 * @returns each segment's holders but `except`, by segment key
 */
function holdersBySegment(doc: YearDocument, except: string): Map<string, Set<string>> {
  const holders = new Map<string, Set<string>>()
  for (const claim of doc.claims) {
    if (claim.polity === except) continue
    for (const [position, ring] of claim.rings.entries()) {
      for (const [a, b] of ringSegments(ring, isRingOpen(claim, position))) {
        const key = segmentKey(a, b)
        const found = holders.get(key)
        if (found === undefined) holders.set(key, new Set([claim.polity]))
        else found.add(claim.polity)
      }
    }
  }
  return holders
}

/**
 * The one neighbour every segment is shared with: each segment held by exactly one other polity, and the
 * same one throughout.
 * @param holders - for each segment, the other polities holding it
 * @returns that polity, or `null`
 */
function commonNeighbour(holders: readonly (readonly string[])[]): string | null {
  const first = holders[0]?.[0]
  if (first === undefined) return null
  return holders.every((others) => others.length === 1 && others[0] === first) ? first : null
}

/**
 * Read a selection for `{Line}`.
 * @param doc - the document
 * @param target - the polity the arrow acts on, or `null`
 * @param selected - the selected anchors
 * @returns what the panel shows — no segment when nothing is aimed at or fewer than two anchors touch
 */
export function readLineSelection(
  doc: YearDocument,
  target: string | null,
  selected: readonly number[]
): LineSelection {
  if (target === null) return { segments: [], neighbour: null, hand: null, mixed: false }
  const segments = selectedSegments(doc, target, selected)
  const holders = holdersBySegment(doc, target)
  const others = (segment: Segment): string[] => [
    ...(holders.get(segmentKey(segment[0], segment[1])) ?? []),
  ]
  const neighbour = commonNeighbour(segments.map(others))
  const hands = new Set(
    segments.map((segment) => doc.runs[coveringRun(doc, segment[0], segment[1])]?.hand ?? null)
  )
  const [single] = hands
  const mixed = hands.size > 1
  return { segments, neighbour, hand: mixed ? null : (single ?? null), mixed }
}
