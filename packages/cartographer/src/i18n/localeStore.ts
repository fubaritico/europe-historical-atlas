import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/**
 * The language the Cartographer speaks, held where every part can read it and hear it change (ATLAS-159): the
 * components through `LocaleProvider` and `useLocale`, the canvas and the year on disk through `get`, asked at
 * each sentence. **It can change** — the language switch of ATLAS-266 calls `set` — so nothing keeps a word
 * made with the language it started in.
 */
export interface LocaleStore {
  /** The language now. */
  get: () => Locale
  /**
   * Speak another language from now on, and tell every listener.
   * @param locale - the new language
   */
  set: (locale: Locale) => void
  /**
   * Hear the language change.
   * @param listener - called after each change
   * @returns a function that stops the listening
   */
  subscribe: (listener: () => void) => () => void
}

/**
 * A store holding a language.
 * @param initial - the language to start in
 * @returns the store
 */
export function createLocaleStore(initial: Locale): LocaleStore {
  let locale = initial
  const listeners = new Set<() => void>()
  return {
    get: () => locale,
    set: (next) => {
      if (next === locale) return
      locale = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
