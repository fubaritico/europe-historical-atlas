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
}

/**
 * The polities of a year as `{Polities}` lists them — `s01`: *"sorted by name"*, *"each entry shows its
 * colour swatch, its name, and its rank"*; `s02` adds the dates and the *"no territory"* mark.
 *
 * Pure: the document and the colours in, rows out, so the list is a literal in its own tests.
 * @param document - the year
 * @param colours - each polity's colour, by id (`core/editor/polityColours`)
 * @returns one row per polity, sorted by name
 */
export function polityRows(
  document: YearDocument,
  colours: ReadonlyMap<string, string>
): PolityRow[] {
  const claimed = new Set(
    document.claims.filter((claim) => claim.rings.length > 0).map((claim) => claim.polity)
  )
  return document.polities
    .map((polity) => ({
      id: polity.id,
      name: polity.name,
      rank: polity.rank ?? '',
      dates: datesOf(polity.existsFrom, polity.existsTo),
      colour: colours.get(polity.id) ?? null,
      hasTerritory: claimed.has(polity.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
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
