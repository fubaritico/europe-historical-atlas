import { use, useMemo } from 'react'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { LocaleContext } from '../localeContext'

import type { Catalogue, Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A component's messages, in the language of the page (ATLAS-159) — named for what it gives, the dev's call.
 *
 * Each component hands **its own catalogue**, kept in its folder; an action several menus offer takes its
 * label from the shared actions catalogue, so one action has one label. The translator is made once per
 * catalogue and language, and reads every message when made: a malformed one fails at the first render.
 *
 * **Outside a {@link LocaleContext} it throws** rather than speaking a default language: a component with no
 * language above it is a wiring fault, and a silent English would hide it (`rules/error-handling.md`).
 * @param catalogue - the component's messages, in every language
 * @returns a function building a message by its key
 */
export function useTranslation<Key extends string>(catalogue: Catalogue<Key>): Translate<Key> {
  // Context
  const locale = use(LocaleContext)

  // Guards
  if (locale === null) {
    throw new Error('Cartographer: no language in context — provide LocaleContext at the root.')
  }

  // Return
  return useMemo(() => createTranslator(catalogue, locale), [catalogue, locale])
}
