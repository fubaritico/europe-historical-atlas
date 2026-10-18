import { segmentKey } from '@europe-historical-atlas/core/editor/borderOverrides'

import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * `{Overrides}`' rows (`s13`, *Where every override lives*): every stretch and every pair the author
 * dressed, named, so each can be found and cleared — the one place they are all visible.
 *
 * **An orphaned stretch is listed, never dropped**: when no ring holds its segments any more (the anchors
 * under it were deleted), the style is still the author's decision, so it stays until `[Clear]` — `s13`,
 * *When an override goes stale*.
 */

/** One row of `{Overrides}`. */
export interface OverrideRow {
  /** A run override or a pair override. */
  kind: 'run' | 'pair'
  /** Its place in the document's list — what `[Clear]` takes. */
  index: number
  /** The hand it sets, or `null` when it states only a fact. */
  hand: string | null
  /** What it dresses: *"32 segments · Royaume de France – Royaume de Bourgogne"*, or *"whole border · …"*. */
  label: string
  /** Whether no ring holds its segments any more. */
  orphaned: boolean
}

/**
 * Who holds a run's segments: every polity whose rings walk one of them.
 * @param doc - the document
 * @param run - the run's anchors
 * @returns the polities' ids, in claim order
 */
function holdersOf(doc: YearDocument, run: readonly number[]): string[] {
  const keys = new Set<string>()
  for (let at = 0; at + 1 < run.length; at += 1) {
    const a = run[at]
    const b = run[at + 1]
    if (a !== undefined && b !== undefined) keys.add(segmentKey(a, b))
  }
  const holders: string[] = []
  for (const claim of doc.claims) {
    const holds = claim.rings.some((ring) =>
      ring.some((a, at) => {
        const b = ring[(at + 1) % ring.length]
        return b !== undefined && keys.has(segmentKey(a, b))
      })
    )
    if (holds && !holders.includes(claim.polity)) holders.push(claim.polity)
  }
  return holders
}

/**
 * Every override of a document, as `{Overrides}` lists it: the stretches first, then the pairs.
 * @param doc - the document
 * @returns the rows
 */
export function overrideRows(doc: YearDocument): OverrideRow[] {
  const nameOf = (id: string): string => doc.polities.find((polity) => polity.id === id)?.name ?? id
  const stretches = doc.runs.map((override, index): OverrideRow => {
    const holders = holdersOf(doc, override.run)
    const segments = override.run.length - 1
    const what = `${String(segments)} ${segments === 1 ? 'segment' : 'segments'}`
    return {
      kind: 'run',
      index,
      hand: override.hand,
      label:
        holders.length === 0
          ? `${what} · orphaned`
          : `${what} · ${holders.map(nameOf).join(' – ')}`,
      orphaned: holders.length === 0,
    }
  })
  const pairs = doc.pairs.map((override, index): OverrideRow => ({
    kind: 'pair',
    index,
    hand: override.hand,
    label: `whole border · ${override.between.map(nameOf).join(' – ')}`,
    orphaned: false,
  }))
  return [...stretches, ...pairs]
}
