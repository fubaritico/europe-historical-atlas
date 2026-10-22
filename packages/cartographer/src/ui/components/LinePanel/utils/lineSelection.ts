import { coveringRun, segmentKey } from '@europe-historical-atlas/core/editor/borderOverrides'

import type { Segment } from '@europe-historical-atlas/core/editor/borderOverrides'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

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
    for (const ring of claim.rings)
      ring.forEach((a, at) => {
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
 * Every polity but one whose rings hold a segment.
 * @param doc - the document
 * @param segment - the segment
 * @param except - the polity left out — the target
 * @returns the others holding it
 */
function othersHolding(doc: YearDocument, segment: Segment, except: string): string[] {
  const key = segmentKey(segment[0], segment[1])
  const holders = new Set<string>()
  for (const claim of doc.claims) {
    if (claim.polity === except) continue
    for (const ring of claim.rings)
      ring.forEach((a, at) => {
        const b = ring[(at + 1) % ring.length]
        if (b !== undefined && segmentKey(a, b) === key) holders.add(claim.polity)
      })
  }
  return [...holders]
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
  const neighbour = commonNeighbour(segments.map((segment) => othersHolding(doc, segment, target)))
  const hands = new Set(
    segments.map((segment) => doc.runs[coveringRun(doc, segment[0], segment[1])]?.hand ?? null)
  )
  const [single] = hands
  const mixed = hands.size > 1
  return { segments, neighbour, hand: mixed ? null : (single ?? null), mixed }
}
