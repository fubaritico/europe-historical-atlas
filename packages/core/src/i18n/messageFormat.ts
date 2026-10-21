/**
 * ICU MessageFormat, the subset this project writes, with no dependency (`plan.md`, P8; ATLAS-159).
 *
 * **The syntax is the standard, the engine is ours.** ICU is what translators and their tools read, which is
 * why it was adopted on 2026-09-24; `intl-messageformat` would cost ~10 kB for features we do not use. What
 * we write:
 *
 * - `{name}` — a value; a number is written the locale's way ("31 200" in French), so pass a year as a
 *   string;
 * - `{count, plural, =0 {aucune} one {# frontière} other {# frontières}}` — `#` is the count; the categories
 *   are the locale's own, from `Intl.PluralRules`;
 * - `{gender, select, feminine {chargée} other {chargé}}` — a choice by value;
 * - an apostrophe is a plain apostrophe ("l'atlas"), except before `{`, `}` or, in a plural, `#`, where it
 *   quotes them; `''` is one apostrophe.
 *
 * **Nothing is guessed** (the dev's call, 2026-10-21): a value the message names and the caller did not pass,
 * a malformed pattern, a plural or a select without `other`, throws a {@link MessageFormatError}. Every
 * catalogue is checked by the tests, so this fails there and not in front of a reader.
 */

import type { Locale } from './locale'

/** One piece of a parsed message. */
export type MessageNode =
  /** Text written as is. */
  | { kind: 'text'; text: string }
  /** `{name}` — a value. */
  | { kind: 'argument'; name: string }
  /** `#` inside a plural — its count. */
  | { kind: 'pound' }
  /** `{name, plural, …}` — a case per exact value (`=0`) or per category (`one`, `other`…). */
  | { kind: 'plural'; name: string; cases: ReadonlyMap<string, readonly MessageNode[]> }
  /** `{name, select, …}` — a case per value. */
  | { kind: 'select'; name: string; cases: ReadonlyMap<string, readonly MessageNode[]> }

/** The values a message is given, by the names it uses. */
export type MessageValues = Readonly<Record<string, string | number>>

/** A message that cannot be read or built. Its text says which and where. */
export class MessageFormatError extends Error {
  /**
   * @param message - what went wrong, with the pattern it went wrong in
   */
  constructor(message: string) {
    super(message)
    this.name = 'MessageFormatError'
  }
}

/** Each language's plural rules, made once — the costly part of `Intl`, and the languages are a closed set. */
const PLURAL_RULES: Readonly<Record<Locale, Intl.PluralRules>> = {
  fr: new Intl.PluralRules('fr'),
  en: new Intl.PluralRules('en'),
}

/** Each language's number format, made once, for the same reason. */
const NUMBER_FORMATS: Readonly<Record<Locale, Intl.NumberFormat>> = {
  fr: new Intl.NumberFormat('fr'),
  en: new Intl.NumberFormat('en'),
}

/** The plural categories ICU knows; a plural case is one of these or an exact `=n`. */
const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

/** Where the parser is in the pattern. */
interface Cursor {
  /** The whole pattern. */
  readonly pattern: string
  /** The index of the next character to read. */
  at: number
}

/**
 * Read a pattern into its pieces.
 * @param pattern - an ICU message
 * @returns its pieces, in order
 * @throws {MessageFormatError} when the pattern is malformed
 */
export function parseMessage(pattern: string): readonly MessageNode[] {
  const cursor: Cursor = { pattern, at: 0 }
  const nodes = readNodes(cursor, false)
  if (cursor.at < pattern.length) fail(cursor, 'a "}" closes nothing')
  return nodes
}

/**
 * Build the text of a parsed message.
 * @param nodes - what {@link parseMessage} answered
 * @param values - the values it names
 * @param locale - the language numbers and plural categories follow
 * @returns the text
 * @throws {MessageFormatError} when a value is missing or of the wrong kind
 */
export function renderMessage(
  nodes: readonly MessageNode[],
  values: MessageValues,
  locale: Locale
): string {
  return render(nodes, values, locale, undefined)
}

/**
 * Read and build a message in one step.
 * @param pattern - an ICU message
 * @param values - the values it names
 * @param locale - the language numbers and plural categories follow
 * @returns the text
 * @throws {MessageFormatError} when the pattern is malformed or a value is missing
 */
export function formatMessage(pattern: string, values: MessageValues, locale: Locale): string {
  return renderMessage(parseMessage(pattern), values, locale)
}

/**
 * Every value a message names, each once — what a caller must pass.
 * @param nodes - what {@link parseMessage} answered
 * @returns the names, sorted
 */
export function messageArguments(nodes: readonly MessageNode[]): string[] {
  const names = new Set<string>()
  const walk = (list: readonly MessageNode[]): void => {
    for (const node of list) {
      if (node.kind === 'argument') names.add(node.name)
      if (node.kind === 'plural' || node.kind === 'select') {
        names.add(node.name)
        for (const branch of node.cases.values()) walk(branch)
      }
    }
  }
  walk(nodes)
  return [...names].sort()
}

/**
 * Text and arguments up to the `}` that closes the current level, or the end.
 * @param cursor - where to read
 * @param inPlural - whether `#` means the count here
 * @returns the pieces read
 */
function readNodes(cursor: Cursor, inPlural: boolean): MessageNode[] {
  const nodes: MessageNode[] = []
  let text = ''
  const flush = (): void => {
    if (text !== '') nodes.push({ kind: 'text', text })
    text = ''
  }
  while (cursor.at < cursor.pattern.length) {
    const char = cursor.pattern.charAt(cursor.at)
    if (char === '}') break
    if (char === "'") {
      text += readApostrophe(cursor, inPlural)
    } else if (char === '{') {
      flush()
      nodes.push(readArgument(cursor, inPlural))
    } else if (char === '#' && inPlural) {
      flush()
      nodes.push({ kind: 'pound' })
      cursor.at += 1
    } else {
      text += char
      cursor.at += 1
    }
  }
  flush()
  return nodes
}

/**
 * An apostrophe: one apostrophe, or the start of a quoted run.
 * @param cursor - on the apostrophe
 * @param inPlural - whether `#` is special here
 * @returns the text it stands for
 */
function readApostrophe(cursor: Cursor, inPlural: boolean): string {
  const next = cursor.pattern[cursor.at + 1]
  if (next === "'") {
    cursor.at += 2
    return "'"
  }
  if (next !== '{' && next !== '}' && !(inPlural && next === '#')) {
    cursor.at += 1
    return "'"
  }
  cursor.at += 1
  let quoted = ''
  while (cursor.at < cursor.pattern.length) {
    const char = cursor.pattern.charAt(cursor.at)
    if (char === "'") {
      if (cursor.pattern[cursor.at + 1] === "'") {
        quoted += "'"
        cursor.at += 2
        continue
      }
      cursor.at += 1
      return quoted
    }
    quoted += char
    cursor.at += 1
  }
  return fail(cursor, 'a quote is never closed')
}

/**
 * `{name}`, `{name, plural, …}` or `{name, select, …}`.
 * @param cursor - on the `{`
 * @param inPlural - whether an enclosing plural gives `#` its count
 * @returns the piece
 */
function readArgument(cursor: Cursor, inPlural: boolean): MessageNode {
  cursor.at += 1
  const name = readWord(cursor)
  if (name === '') fail(cursor, 'an argument has no name')
  skipSpaces(cursor)
  if (take(cursor, '}')) return { kind: 'argument', name }
  expect(cursor, ',')
  const type = readWord(cursor)
  if (type !== 'plural' && type !== 'select') {
    fail(cursor, `"${type}" is not a type this engine knows — plural or select`)
  }
  expect(cursor, ',')
  const cases = readCases(cursor, type === 'plural' || inPlural, type === 'plural')
  expect(cursor, '}')
  return { kind: type, name, cases }
}

/**
 * The `key {…}` pairs of a plural or a select.
 * @param cursor - after the type's comma
 * @param inPlural - whether `#` means a count inside the cases
 * @param plural - whether the keys are plural categories
 * @returns the cases, by key
 */
function readCases(
  cursor: Cursor,
  inPlural: boolean,
  plural: boolean
): Map<string, readonly MessageNode[]> {
  const cases = new Map<string, readonly MessageNode[]>()
  for (;;) {
    skipSpaces(cursor)
    if (cursor.at >= cursor.pattern.length || cursor.pattern[cursor.at] === '}') break
    const key = readCaseKey(cursor, plural)
    if (cases.has(key)) fail(cursor, `the case "${key}" is written twice`)
    expect(cursor, '{')
    cases.set(key, readNodes(cursor, inPlural))
    expect(cursor, '}')
  }
  if (!cases.has('other')) fail(cursor, 'a plural or a select needs an "other" case')
  return cases
}

/**
 * A case's key: an exact `=n`, a plural category, or — in a select — any word.
 * @param cursor - on the key, spaces allowed before
 * @param plural - whether the key must be a plural category or an exact value
 * @returns the key, `=n` kept with its sign
 */
function readCaseKey(cursor: Cursor, plural: boolean): string {
  const exact = take(cursor, '=')
  const word = readWord(cursor)
  if (word === '') fail(cursor, 'a case has no key')
  if (exact) return `=${word}`
  if (plural && !PLURAL_CATEGORIES.has(word)) fail(cursor, `"${word}" is not a plural category`)
  return word
}

/**
 * Letters, digits, `_` and `-` — a name or a case key.
 * @param cursor - where to read, spaces skipped first
 * @returns the word, possibly empty
 */
function readWord(cursor: Cursor): string {
  skipSpaces(cursor)
  const match = /^[\w-]+/.exec(cursor.pattern.slice(cursor.at))
  const word = match?.[0] ?? ''
  cursor.at += word.length
  return word
}

/**
 * Move past spaces, tabs and line breaks.
 * @param cursor - where to skip
 */
function skipSpaces(cursor: Cursor): void {
  while (/\s/.test(cursor.pattern[cursor.at] ?? '')) cursor.at += 1
}

/**
 * Take one character if it is the one expected.
 * @param cursor - where to look, spaces skipped first
 * @param char - the character
 * @returns whether it was there
 */
function take(cursor: Cursor, char: string): boolean {
  skipSpaces(cursor)
  if (cursor.pattern[cursor.at] !== char) return false
  cursor.at += 1
  return true
}

/**
 * Take one character, or fail naming it.
 * @param cursor - where to look
 * @param char - the character the syntax requires here
 */
function expect(cursor: Cursor, char: string): void {
  if (!take(cursor, char)) fail(cursor, `a "${char}" is expected`)
}

/**
 * Stop reading, saying where.
 * @param cursor - where it went wrong
 * @param reason - what went wrong
 * @returns never
 */
function fail(cursor: Cursor, reason: string): never {
  throw new MessageFormatError(`${reason}, at ${String(cursor.at)} in "${cursor.pattern}"`)
}

/**
 * The text of some pieces.
 * @param nodes - the pieces
 * @param values - the values they name
 * @param locale - the language
 * @param count - the count `#` stands for, inside a plural
 * @returns the text
 */
function render(
  nodes: readonly MessageNode[],
  values: MessageValues,
  locale: Locale,
  count: number | undefined
): string {
  let text = ''
  for (const node of nodes) {
    if (node.kind === 'text') text += node.text
    else if (node.kind === 'pound') {
      // The parser only makes a `#` inside a plural, which always passes its count down.
      if (count === undefined) throw new MessageFormatError('a "#" outside any plural')
      text += formatNumber(count, locale)
    } else if (node.kind === 'argument') {
      const value = valueOf(values, node.name)
      text += typeof value === 'number' ? formatNumber(value, locale) : value
    } else if (node.kind === 'plural') {
      const value = valueOf(values, node.name)
      if (typeof value !== 'number') {
        throw new MessageFormatError(`the plural "${node.name}" needs a number, not "${value}"`)
      }
      text += render(pluralCase(node.cases, value, locale), values, locale, value)
    } else {
      const value = String(valueOf(values, node.name))
      text += render(node.cases.get(value) ?? otherCase(node.cases), values, locale, count)
    }
  }
  return text
}

/**
 * The case a count takes: an exact `=n` first, then the locale's category, then `other` — ICU's order.
 * @param cases - the plural's cases
 * @param value - the count
 * @param locale - whose plural rules
 * @returns the pieces of that case
 */
function pluralCase(
  cases: ReadonlyMap<string, readonly MessageNode[]>,
  value: number,
  locale: Locale
): readonly MessageNode[] {
  const category = PLURAL_RULES[locale].select(value)
  return cases.get(`=${String(value)}`) ?? cases.get(category) ?? otherCase(cases)
}

/**
 * The `other` case — ICU's own default, not a guess: every plural and select has one, the parser makes sure.
 * @param cases - a plural's or a select's cases
 * @returns the pieces of its `other` case
 */
function otherCase(cases: ReadonlyMap<string, readonly MessageNode[]>): readonly MessageNode[] {
  const other = cases.get('other')
  if (other === undefined) throw new MessageFormatError('a plural or a select without "other"')
  return other
}

/**
 * A value the message names — never a guess when it is missing.
 * @param values - what the caller passed
 * @param name - the name the message uses
 * @returns the value
 */
function valueOf(values: MessageValues, name: string): string | number {
  // Own keys only: `values.constructor` is inherited, and would print a function instead of failing.
  const value = Object.hasOwn(values, name) ? values[name] : undefined
  if (value === undefined) throw new MessageFormatError(`the value "${name}" is missing`)
  return value
}

/**
 * A number the locale's way: "31 200" in French, "31,200" in English.
 * @param value - the number
 * @param locale - the language
 * @returns the text
 */
function formatNumber(value: number, locale: Locale): string {
  return NUMBER_FORMATS[locale].format(value)
}
