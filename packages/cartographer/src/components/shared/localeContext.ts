import { createContext } from 'react'

import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/**
 * The language the Cartographer speaks, provided once at the composition root (ATLAS-159).
 *
 * **A value, not a handle — and that is safe here** where `react-canvas-and-panels` warns against it: the
 * language is chosen once, from the browser, before the first render, and never changes during a session, so
 * the context re-renders nobody. A language switch (ATLAS-266) would change that, and should then re-render
 * every label, which is exactly what a context does.
 *
 * `null` is no provider at all — a wiring fault, which {@link useTranslation} refuses loudly.
 */
export const LocaleContext = createContext<Locale | null>(null)
