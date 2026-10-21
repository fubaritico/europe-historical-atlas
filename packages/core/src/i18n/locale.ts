/**
 * The languages this project's interfaces speak: French and English, for the atlas and the Cartographer
 * alike (`plan.md`, P8 — the Cartographer joined on 2026-10-21, the dev's call).
 */

/** Every language, as a value. The list is the source of truth and {@link Locale} is derived from it. */
export const LOCALES = ['fr', 'en'] as const

/** A language an interface can be shown in — a BCP 47 tag, so `Intl` reads it as is. */
export type Locale = (typeof LOCALES)[number]

/**
 * The language to show, from the reader's preferred ones: French when the **first** is French (`fr`,
 * `fr-FR`, `fr-CA`…), English otherwise — the dev's rule, 2026-10-21.
 *
 * The preferences are passed in, never read here: `core` has no browser. An application gives
 * `navigator.languages`; a setting or the page's address would give another list, with nothing to change.
 * @param preferred - language tags, most preferred first
 * @returns `fr` or `en`
 */
export function pickLocale(preferred: readonly string[]): Locale {
  const first = preferred[0]?.toLowerCase() ?? ''
  return first === 'fr' || first.startsWith('fr-') ? 'fr' : 'en'
}
