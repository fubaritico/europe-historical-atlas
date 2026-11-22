import { isNameLanguage } from '@europe-historical-atlas/core/data/periodName'

import type { NameForm } from '@europe-historical-atlas/core/data/periodName'

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
