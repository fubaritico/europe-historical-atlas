import type { DraftOption } from '../../../utils/polityDraft'

/**
 * Which polities to offer as a suzerain for what the author has typed (CARTO-241) — the polities of the
 * year number about 150 in 1100, too many to scroll; typing a few letters narrows them.
 *
 * Case and accents do not count (*« ile »* finds *Île-de-France*), names that **start** with the query come
 * first, then those that contain it, each group in the list's own order. Pure, so it is tested with literals.
 */

/** The most suggestions shown at once — a short list to read, the rest reached by typing one letter more. */
export const MAX_SUGGESTIONS = 30

/**
 * A name reduced for comparison: lower case, accents removed.
 * @param text - a name or a query
 * @returns the folded text
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * The options matching a query: prefix matches first, then the others containing it.
 * @param options - every polity that may be chosen, already cleared of the ones that would make a loop
 * @param query - what the author typed
 * @param limit - the most to return
 * @returns the matches, best first; none for a blank query
 */
export function matchingOptions(
  options: readonly DraftOption[],
  query: string,
  limit: number
): DraftOption[] {
  const wanted = foldForSearch(query.trim())
  if (wanted === '') return []
  const starts: DraftOption[] = []
  const contains: DraftOption[] = []
  for (const option of options) {
    const name = foldForSearch(option.label)
    if (name.startsWith(wanted)) starts.push(option)
    else if (name.includes(wanted)) contains.push(option)
  }
  return [...starts, ...contains].slice(0, limit)
}
