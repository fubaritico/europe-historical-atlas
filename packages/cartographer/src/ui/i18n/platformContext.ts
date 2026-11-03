import { createContext } from 'react'

import type { Platform } from '@europe-historical-atlas/core/i18n/shortcuts'

/**
 * The system the shortcuts are shown for (CARTO-345, the shortcut converter) — read once at the composition root
 * (`ui/utils/commandListener.ts`'s `shownPlatform`) and provided over the whole chrome, as the language is.
 *
 * **`null` without a provider**, so {@link useShortcut} can throw: a label written for a system guessed would hide a
 * wiring fault (`rules/error-handling.md`).
 */
export const PlatformContext = createContext<Platform | null>(null)
