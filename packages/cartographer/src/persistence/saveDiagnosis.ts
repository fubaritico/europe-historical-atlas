import type { PersistenceWords } from './persistenceWords'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * Why a map was not saved, in the author's words (the dev, 2026-11-13: a Wikidata id mistyped in a polity's form, every
 * save refused, and the dialog only said *« non enregistré (détail dans la console) »* — *« faudrait pouvoir le
 * signaler… donner un diagnostic »*).
 *
 * The server refuses a year with its schema's words, in English — `yearRegistry (schema) years/1100/registry.json:
 * polities[135].wikidata: should be a Wikidata id like Q70972`. A refusal of one polity's field is read back here: the
 * polity is named from the document, by the same rank (the registry is written in the document's order), and the
 * sentence says the field, the value and what to do. **Any other refusal keeps the old sentence**, the detail in the
 * console — never the server's English inside a French sentence (`persistence/i18n`).
 */

/** A refusal of one polity's field, as the server words it: the polity's rank and the field. */
const POLITY_FIELD = /polities\[(\d+)\]\.(\w+):/

/**
 * The sentence that says why a map was not saved.
 * @param map - the map's name
 * @param error - what the save threw
 * @param document - the document that was sent, to name the polity and read its value
 * @param words - the sentences
 * @returns the sentence for the alarm
 */
export function notSavedSentence(
  map: string,
  error: unknown,
  document: Pick<YearDocument, 'polities'>,
  words: PersistenceWords
): string {
  const message = error instanceof Error ? error.message : String(error)
  const match = POLITY_FIELD.exec(message)
  const polity = match === null ? undefined : document.polities[Number(match[1])]
  if (match === null || polity === undefined) return words.t('notSaved')
  const field = match[2] ?? ''
  if (field === 'wikidata') {
    return words.t('notSavedWikidata', {
      year: map,
      name: polity.name,
      value: polity.wikidata ?? '',
    })
  }
  return words.t('notSavedPolityField', { year: map, name: polity.name, field })
}
