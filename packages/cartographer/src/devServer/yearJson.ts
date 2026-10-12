/**
 * How a year's files are laid out on disk — readable by a person, and diffable line by line.
 *
 * **Why not `JSON.stringify(value, null, 2)`.** That puts every number of every array on its own line, so
 * one anchor `[2.35, 48.85]` takes four lines and a year of 17 000 anchors takes 70 000. A year is
 * corrected by hand over months and reviewed in git, so the file has to read: **objects are indented, and
 * an array holding only numbers stays on one line** — an anchor, a ring of indices. Moving one anchor then
 * changes one line, which is what makes a diff of two saves legible.
 *
 * **Why not one line for the whole file**: the same reason the other way round — a diff would be one line
 * long, and say nothing.
 */

/** The indentation step, in spaces. */
const INDENT = '  '

/**
 * Whether an array holds only numbers — the case written on one line.
 * @param items - the array
 * @returns `true` when every item is a number (an empty array included)
 */
function isNumberRow(items: readonly unknown[]): boolean {
  return items.every((item) => typeof item === 'number')
}

/**
 * Write one value at a depth.
 *
 * Anything that is not an object or an array is left to `JSON.stringify`, which already knows how to quote
 * a string and refuses what JSON cannot hold.
 * @param value - the value
 * @param depth - how many indentation steps it sits at
 * @returns its text
 */
function writeValue(value: unknown, depth: number): string {
  if (Array.isArray(value)) return writeArray(value, depth)
  if (value !== null && typeof value === 'object') return writeObject(value, depth)
  return JSON.stringify(value)
}

/**
 * Write an array: on one line when it holds only numbers, one item per line otherwise.
 * @param items - the array
 * @param depth - its indentation depth
 * @returns its text
 */
function writeArray(items: readonly unknown[], depth: number): string {
  if (items.length === 0) return '[]'
  if (isNumberRow(items)) return `[${items.map((item) => JSON.stringify(item)).join(', ')}]`
  const inner = INDENT.repeat(depth + 1)
  const lines = items.map((item) => `${inner}${writeValue(item, depth + 1)}`)
  return `[\n${lines.join(',\n')}\n${INDENT.repeat(depth)}]`
}

/**
 * Write an object, one key per line, in its own key order.
 * @param object - the object
 * @param depth - its indentation depth
 * @returns its text
 */
function writeObject(object: object, depth: number): string {
  const entries = Object.entries(object)
  if (entries.length === 0) return '{}'
  const inner = INDENT.repeat(depth + 1)
  const lines = entries.map(
    ([key, item]) => `${inner}${JSON.stringify(key)}: ${writeValue(item, depth + 1)}`
  )
  return `{\n${lines.join(',\n')}\n${INDENT.repeat(depth)}}`
}

/**
 * Lay a year file out as text: indented objects, arrays of numbers on one line, a final newline.
 * @param value - one of the three files, or the manifest
 * @returns the file's text, ending with a newline as a text file should
 */
export function formatYearJson(value: unknown): string {
  return `${writeValue(value, 0)}\n`
}
