/**
 * The declarations of one rule of a stylesheet read as text, comments removed and whitespace collapsed.
 *
 * For the sheet tests only: jsdom has no cascade of layers, so a computed size cannot be read there, and
 * what a test can pin is that the sheet still holds the declaration a browser measurement proved.
 *
 * @param sheet - The stylesheet's source, as imported with `?raw`.
 * @param name - The sheet's file name, for the error message.
 * @param selector - The rule's exact selector, as written before its `{`.
 * @returns The rule from its selector up to its closing brace, on one line.
 * @throws When the sheet holds no rule with that exact selector — a test reading nothing must not pass.
 */
export function sheetRule(sheet: string, name: string, selector: string): string {
  const code = sheet.replace(/\/\*[\s\S]*?\*\//g, '')
  // The selector must open its own line: a bare substring search would also take the tail of a compound
  // selector such as `.panel .visually-hidden {`, and a test would pass while reading another rule.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const opening = `${selector} {`
  const match = new RegExp(`(?:^|\\n)[ \\t]*${escaped} \\{`).exec(code)
  if (match === null) throw new Error(`${selector} is not in ${name}`)
  const start = match.index + match[0].length - opening.length
  return code.slice(start, code.indexOf('}', start)).replace(/\s+/g, ' ')
}
