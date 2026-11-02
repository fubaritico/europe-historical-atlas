/**
 * Which year the Cartographer opens on, read from the address — `?year=1200` — so *Open…* can reopen it on another year
 * (the dev, 2026-11-02: « on fait Open, 1100, 1200 »).
 *
 * **No `year` in the address is the ordinary case**, not a failure: the editor opens on its first year. **A `year` that is
 * not a year is a defect** — only *Open…* writes the address, so a hand-typed or broken one is refused loudly rather than
 * read as the first year, which would have the author drawing on 1100 while believing it 1200.
 */

/** The name of the address's parameter. */
const PARAMETER = 'year'

/** A year as the address may write it: an integer, before Christ negative. Four digits at most, as `years/` holds. */
const YEAR_TEXT = /^-?\d{1,4}$/

/**
 * The year the address asks for.
 * @param search - the address's query, `window.location.search` — with or without its `?`
 * @param firstYear - the year to open when the address names none
 * @returns the year
 * @throws Error when the address names a `year` that is not one, saying what it read
 */
export function openingYearOf(search: string, firstYear: number): number {
  const asked = new URLSearchParams(search).get(PARAMETER)
  if (asked === null) return firstYear
  if (!YEAR_TEXT.test(asked)) {
    throw new Error(
      `[Cartographer] the address asks for the year « ${asked} », which is not a year — open a year with Open…, or write ?year=1200`
    )
  }
  return Number(asked)
}

/**
 * The address that opens the Cartographer on a year, the rest of the query kept.
 * @param search - the current query, `window.location.search`
 * @param year - the year to open
 * @returns the query to go to, starting with `?`
 */
export function addressForYear(search: string, year: number): string {
  const parameters = new URLSearchParams(search)
  parameters.set(PARAMETER, String(year))
  return `?${parameters.toString()}`
}
