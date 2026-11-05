/** Combining marks, which a decomposed letter carries apart from its base: « é » is « e » followed by one. */
const COMBINING_MARKS = /\p{M}/gu

/**
 * The Latin letters of Europe's names that carry their mark in their shape, so decomposing them leaves them whole
 * (review QUAL-002): « lodz » must find « Łódź », « o » the « ø » of Danish and Norwegian names. Lower case only: the
 * text is lower-cased first.
 */
const UNDECOMPOSED: Readonly<Record<string, string>> = {
  ł: 'l',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  ħ: 'h',
  ı: 'i',
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  þ: 'th',
}

/** Any of {@link UNDECOMPOSED}'s letters. */
const UNDECOMPOSED_LETTER = /[łøđðħıßæœþ]/gu

/**
 * A text folded for comparison: decomposed, stripped of its accents, lower-cased, and the letters that keep their
 * mark in their shape written plain.
 * @param text - the text as written
 * @returns the text the filter compares
 */
function folded(text: string): string {
  // The pattern matches the table's letters only: the `??` is for the type checker, never reached.
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(UNDECOMPOSED_LETTER, (letter) => UNDECOMPOSED[letter] ?? letter)
}

/**
 * Whether a name answers what was typed in a panel's filter (CARTO-360) — **anywhere in the name, case and accents
 * ignored**: « kiev » finds « Kiev », « boheme » finds « Bohême », « lodz » finds « Łódź », « emp » finds
 * « Saint-Empire ». What was typed is trimmed, so an empty filter, or one of spaces only, lets every name through.
 * @param name - the row's name, verbatim
 * @param query - what was typed in the filter
 * @returns `true` when the name holds the query
 */
export function matchesFilter(name: string, query: string): boolean {
  const wanted = folded(query.trim())
  return wanted === '' || folded(name).includes(wanted)
}
