import { use } from 'react'

import { shortcutText } from '../../i18n/commandKeys'
import { PlatformContext } from '../i18n/platformContext'

import { useLocale } from './useLocale'

import type { Command, ShortcutText } from '../../i18n/commandKeys'
import type { Platform } from '@europe-historical-atlas/core/i18n/shortcuts'

/**
 * The system provided, or a wiring fault said loudly.
 * @param platform - what the context holds
 * @returns the system
 * @throws when no `PlatformContext` is above the component
 */
function knownPlatform(platform: Platform | null): Platform {
  if (platform === null) {
    throw new Error('Cartographer: no system in context — provide PlatformContext at the root.')
  }
  return platform
}

/**
 * The shortcuts of the commands, as this system and this language write them (CARTO-345, the shortcut converter) —
 * from the one table every listener hears (`i18n/commandKeys.ts`).
 *
 * **Outside a `PlatformContext` it throws**, as the language does outside its provider: a component with no system
 * above it is a wiring fault.
 * @returns a function giving a command's shortcut
 */
export function useShortcut(): (command: Command) => ShortcutText {
  // Context
  const platform = use(PlatformContext)
  const locale = useLocale()

  // Derived
  const known = knownPlatform(platform)

  // Return
  return (command) => shortcutText(command, known, locale)
}
