import {
  NAME_LANGUAGES,
  isNameLanguage,
  repeatedLanguage,
} from '@europe-historical-atlas/core/data/periodName'

import type { NameForm, NameLanguage } from '@europe-historical-atlas/core/data/periodName'

/** What the forms call each language a name can be written in. */
export const LANGUAGE_LABELS: Readonly<Record<NameLanguage, string>> = {
  fr: 'Français',
  en: 'Anglais',
  es: 'Espagnol',
  it: 'Italien',
  de: 'Allemand',
}

/**
 * The languages a territory's other names are written in: every language but French, which is the territory's own
 * name in the register (CMS-495).
 */
export const OTHER_LANGUAGES = NAME_LANGUAGES.filter((language) => language !== 'fr')

/**
 * A name of the time's table of correspondence as `core` reads it, from the rows Payload holds (CMS-495): the rows
 * with a language of the list and a form that is not blank, each form without the spaces around it. A row not yet
 * filled is left out — the fields' own rules refuse it at the save.
 *
 * Its own module, free of Payload's server code, because the collection and the export both read it.
 * @param value - the `forms` field
 * @returns its complete lines
 */
export function nameForms(value: unknown): NameForm[] {
  if (!Array.isArray(value)) return []
  return (value as { language?: unknown; form?: unknown }[]).flatMap(({ language, form }) =>
    isNameLanguage(language) && typeof form === 'string' && form.trim() !== ''
      ? [{ language, form: form.trim() }]
      : []
  )
}

/**
 * The rule of a territory's names in the other languages (CMS-495): one form a language, and never French — the
 * French name is the territory's own field, and a second French name here would be a second home for one fact.
 * Facultative: a territory with no other name is valid.
 * @param value - the `otherNames` field
 * @returns `true`, or the sentence said under the table
 */
export function validateOtherNames(value: unknown): string | true {
  const forms = nameForms(value)
  if (forms.some(({ language }) => language === 'fr')) {
    return 'Le nom français est le champ « Nom », au-dessus : ce tableau tient les autres langues.'
  }
  const twice = repeatedLanguage(forms)
  return twice === null
    ? true
    : `La langue « ${LANGUAGE_LABELS[twice]} » est saisie deux fois : une seule forme par langue.`
}
