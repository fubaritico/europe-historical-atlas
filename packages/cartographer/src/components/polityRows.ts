import { effectiveSuzerains } from '@europe-historical-atlas/core/data/paintOrder'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** One row of `{Polities}`, as the list shows it. */
export interface PolityRow {
  /** The polity's id — what choosing the row aims at. */
  id: string
  /** Its name, verbatim. */
  name: string
  /** Its rank, or `''` when none is set. */
  rank: string
  /** Its dates as `s02` writes them — `"987–"`, `"962–1806"` — or `''` when neither is known. */
  dates: string
  /**
   * The colour it is painted in — its own when pinned, its palette slot otherwise — or `null` when the
   * colour source has none for it, which the list shows as a struck swatch rather than a blank one
   * (QUAL-001): the source colours every polity of the document, so `null` is a defect made visible.
   */
  colour: string | null
  /** Whether it holds at least one ring — `s02`'s *"marked 'no territory'"* when not. */
  hasTerritory: boolean
  /** How deep in the tree of groups: 0 for a polity owing nobody, 1 for its vassals… — the indent. */
  depth: number
}

/**
 * The polities of a year as `{Polities}` lists them — **the tree of groups** (`s16`, the dev's layer
 * model of 2026-10-11): each polity followed by its vassals, indented, and **the front first at every
 * level**, as Illustrator's Layers panel lists them. So the list *is* the stack: what a Bring to Front
 * does is seen in it, not only on the canvas. Replaces `s01`'s sort by name (`H-33`).
 *
 * Each row shows the swatch, the name and the rank (`s01`), the dates and the *"no territory"* mark
 * (`s02`). Polities caught in a loop of homage come last, at the top level — `documentFaults` says so.
 *
 * Pure: the document and the colours in, rows out, so the list is a literal in its own tests.
 * @param document - the year
 * @param colours - each polity's colour, by id (`core/editor/polityColours`)
 * @returns one row per polity, in the tree's order
 */
export function polityRows(
  document: YearDocument,
  colours: ReadonlyMap<string, string>
): PolityRow[] {
  const claimed = new Set(
    document.claims.filter((claim) => claim.rings.length > 0).map((claim) => claim.polity)
  )
  const suzerains = effectiveSuzerains(document.polities)
  const children = new Map<string | null, YearPolity[]>()
  for (const polity of document.polities) {
    const group = suzerains.get(polity.id) ?? null
    const siblings = children.get(group)
    if (siblings === undefined) children.set(group, [polity])
    else siblings.push(polity)
  }
  const rows: PolityRow[] = []
  const listed = new Set<string>()
  const walk = (polity: YearPolity, depth: number): void => {
    if (listed.has(polity.id)) return
    listed.add(polity.id)
    rows.push({
      id: polity.id,
      name: polity.name,
      rank: polity.rank ?? '',
      dates: datesOf(polity.existsFrom, polity.existsTo),
      colour: colours.get(polity.id) ?? null,
      hasTerritory: claimed.has(polity.id),
      depth,
    })
    // Front first: the list order is back to front, so each level is read backwards.
    for (const vassal of [...(children.get(polity.id) ?? [])].reverse()) walk(vassal, depth + 1)
  }
  for (const polity of [...(children.get(null) ?? [])].reverse()) walk(polity, 0)
  for (const polity of document.polities) walk(polity, 0)
  return rows
}

/**
 * A polity's dates as `s02` writes them.
 * @param from - when it began, or `null`
 * @param to - when it ended, or `null`
 * @returns `"987–"`, `"–1806"`, `"962–1806"`, or `''` when neither is known
 */
function datesOf(from: number | null, to: number | null): string {
  if (from === null && to === null) return ''
  return `${from === null ? '' : String(from)}–${to === null ? '' : String(to)}`
}
