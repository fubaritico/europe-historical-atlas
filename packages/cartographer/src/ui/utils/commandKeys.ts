import { isChord, platformOf } from '@europe-historical-atlas/core/i18n/shortcuts'

import { keepsItsOwnKeys } from '../../canvas/history/historyShortcut'

import type { Chord, Platform, PlatformHints } from '@europe-historical-atlas/core/i18n/shortcuts'

/**
 * The commands' keys, as the dev validated them on 2026-11-03 (CARTO-345, `files/plans/cartographer/
 * copy-paste-between-maps.md`): what a label is written from (`core/i18n/shortcuts`), and what the page hears through
 * {@link listenForCommand}.
 *
 * **Heard through this table today: ‹cmd+C› only.** Save, undo and redo are still heard by their own modules
 * (`persistence/saveShortcut.ts`, `canvas/navigation.ts`'s `historyKey`), with the same keys written there; the paste
 * keys are not heard yet.
 */
export const COMMAND_KEYS = {
  open: { key: 'o', command: true },
  save: { key: 's', command: true },
  saveAs: { key: 's', command: true, shift: true },
  undo: { key: 'z', command: true },
  redo: { key: 'z', command: true, shift: true },
  copy: { key: 'c', command: true },
  paste: { key: 'v', command: true },
  pasteSheet: { key: 'v', command: true, shift: true },
  pasteOutline: { key: 'v', command: true, alt: true },
} as const satisfies Record<string, Chord>

/** A command of {@link COMMAND_KEYS}. */
export type Command = keyof typeof COMMAND_KEYS

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
 * Hear a command's key anywhere on the page but a text field or an open dialogue.
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
    onCommand()
  }
  target.addEventListener('keydown', listener)
  return () => {
    target.removeEventListener('keydown', listener)
  }
}
