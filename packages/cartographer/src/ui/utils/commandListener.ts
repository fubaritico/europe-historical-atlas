import { isChord, platformOf } from '@europe-historical-atlas/core/i18n/shortcuts'

import { keepsItsOwnKeys } from '../../canvas/history/historyShortcut'
import { COMMAND_KEYS } from '../../i18n/commandKeys'

import type { Command } from '../../i18n/commandKeys'
import type { Platform, PlatformHints } from '@europe-historical-atlas/core/i18n/shortcuts'

/**
 * A command's key heard on the page (CARTO-345) — its keys are `i18n/commandKeys.ts`'s, the one table every listener
 * and every label reads.
 */

/**
 * The system the shortcuts are shown for, read once at the root.
 *
 * **A browser that says nothing of its system shows ‹Ctrl›, said in the console** (the dev's call, 2026-11-03): both
 * keys work everywhere, so the cost is a label, never a shortcut that does nothing.
 * @param hints - what the browser says — `navigator` in the page
 * @returns the system
 */
export function shownPlatform(hints: PlatformHints): Platform {
  const platform = platformOf(hints)
  if (platform !== null) return platform
  console.warn(
    '[Cartographer] the browser does not say its system: the shortcuts are shown with Ctrl.'
  )
  return 'other'
}

/** Where a command's key is heard — the page's document in the application, a stub in tests. */
export interface CommandKeyTarget {
  /** Start listening. */
  addEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
  /** Stop listening. */
  removeEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
}

/**
 * Whether a key pressed is a command's, and the page may answer it: never in a text field or an open dialogue, which
 * keep their own ‹cmd+C›, and never a key already answered.
 * @param event - the key pressed
 * @param command - the command
 * @returns `true` when the page answers it
 */
function isPageCommand(event: KeyboardEvent, command: Command): boolean {
  if (event.defaultPrevented || keepsItsOwnKeys(event.target)) return false
  return isChord(event, COMMAND_KEYS[command])
}

/**
 * Hear a command's key anywhere on the page but a text field or an open dialogue, once per press.
 *
 * **Left to a field and a dialogue on purpose**, unlike ‹cmd+S› (`persistence/saveShortcut.ts`): ‹cmd+C› there copies
 * the text, and ‹cmd+O› heard inside *Open…*'s own dialogue would open it again over itself. The browser's own answer
 * to ‹cmd+O› in a field — its file dialogue — is the cost, my choice of 2026-11-03.
 * @param target - where to listen
 * @param command - the command
 * @param onCommand - what it does
 * @returns a function that stops listening
 */
export function listenForCommand(
  target: CommandKeyTarget,
  command: Command,
  onCommand: () => void
): () => void {
  const listener = (event: KeyboardEvent): void => {
    if (!isPageCommand(event, command)) return
    event.preventDefault()
    // One gesture, one command: a held key repeats, and each repetition would open a dialogue again, as `saveShortcut`.
    if (!event.repeat) onCommand()
  }
  target.addEventListener('keydown', listener)
  return () => {
    target.removeEventListener('keydown', listener)
  }
}
