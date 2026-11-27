import { readNumber } from './sheetValues'

/**
 * The sheet's year, read from its start as typed — the hierarchical chain is read at a year (`vassal-chain.md`: a
 * sheet is a picture of a year). Anything but a whole year other than 0 is no year yet: the date's own rules say why
 * under it.
 * @param typed - the start's year, as typed
 * @returns the year, or `null`
 */
export function sheetYear(typed: string): number | null {
  const year = readNumber(typed)
  return year === null || !Number.isInteger(year) || year === 0 ? null : year
}
