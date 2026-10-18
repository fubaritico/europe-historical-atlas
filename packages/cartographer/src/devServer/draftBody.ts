/**
 * What the draft endpoint and the snapshot endpoint share about a draft-shaped body and a dated file name
 * (CARTO-238) — one home, so a draft and a snapshot are checked and named alike.
 */

/**
 * A time as it goes into a file name — sortable, and safe on every disk (no colon).
 * @param at - the time
 * @returns e.g. `2026-10-17T15-42-07Z`
 */
export function fileTime(at: Date): string {
  return at
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replaceAll(':', '-')
}

/**
 * Whether a body is a draft of that year: JSON, an object, whose `year` is the year of the path.
 * @param body - the request's body
 * @param year - the year in the path
 * @returns the reason it is not, or `null`
 */
export function whyNotADraft(body: string, year: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return 'the draft is not JSON'
  }
  if (parsed === null || typeof parsed !== 'object' || !('year' in parsed))
    return 'the draft does not say its year'
  if (String(parsed.year) !== year)
    return `the draft is of year ${String(parsed.year)}, not ${year}`
  return null
}
