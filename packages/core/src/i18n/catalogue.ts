/**
 * A catalogue: every message of one part of an application, in every language, under one set of keys.
 *
 * **A missing translation is a compile error**: the type wants each key in each language (`plan.md`, P8). Each
 * application and each part of `core` that shows text keeps its own catalogue, bundled with its code — never
 * fetched, so the message explaining that the network failed can always be shown. Content (places, events)
 * is not here: it comes from the contribution tool.
 */

import { LOCALES } from './locale'
import { MessageFormatError, messageArguments, parseMessage, renderMessage } from './messageFormat'

import type { Locale } from './locale'
import type { MessageNode, MessageValues } from './messageFormat'

/** Every message, by language, then by key — each language holding every key. */
export type Catalogue<Key extends string> = Readonly<Record<Locale, Readonly<Record<Key, string>>>>

/** A catalogue's messages in one language, ready to be built. */
export type Translate<Key extends string> = (key: Key, values?: MessageValues) => string

/**
 * The translator of a catalogue in one language. Every message is read **now**, so a malformed one fails
 * when the translator is made, not the first time it is shown.
 * @param catalogue - the messages
 * @param locale - the language to speak
 * @returns a function building a message by its key
 * @throws {MessageFormatError} when a message is malformed
 */
export function createTranslator<Key extends string>(
  catalogue: Catalogue<Key>,
  locale: Locale
): Translate<Key> {
  const parsed = new Map<string, readonly MessageNode[]>()
  for (const [key, pattern] of Object.entries<string>(catalogue[locale])) {
    parsed.set(key, parseMessage(pattern))
  }
  return (key, values = {}) => {
    const nodes = parsed.get(key)
    if (nodes === undefined) throw new MessageFormatError(`no message "${key}" in ${locale}`)
    return renderMessage(nodes, values, locale)
  }
}

/**
 * The keys whose languages disagree on the values they take — `{count}` in French, `{total}` in English.
 * The types see a missing key; only this sees a translation that drifted.
 * @param catalogue - the messages
 * @returns one line per disagreement, empty when the catalogue is coherent
 * @throws {MessageFormatError} when a message is malformed
 */
export function catalogueMismatches<Key extends string>(catalogue: Catalogue<Key>): string[] {
  const [reference, ...others] = LOCALES
  const mismatches: string[] = []
  for (const [key, pattern] of Object.entries<string>(catalogue[reference])) {
    const expected = messageArguments(parseMessage(pattern)).join(', ')
    for (const locale of others) {
      const other = catalogue[locale][key as Key]
      const found = messageArguments(parseMessage(other)).join(', ')
      if (found !== expected) {
        mismatches.push(`${key}: ${reference} takes [${expected}], ${locale} takes [${found}]`)
      }
    }
  }
  return mismatches
}
