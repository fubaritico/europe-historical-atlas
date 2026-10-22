import { createContext } from 'react'

import type { LocaleStore } from '../../i18n/localeStore'

/**
 * The language store, provided once at the composition root by `LocaleProvider` (ATLAS-159). **The store, not
 * the language**: a component reads the language through `useLocale`, which subscribes to it, so a switch
 * (ATLAS-266) re-renders every label; the canvas, mounted once, reads it at each sentence.
 *
 * `null` is no provider at all — a wiring fault, which `useLocale` refuses loudly.
 */
export const LocaleContext = createContext<LocaleStore | null>(null)
