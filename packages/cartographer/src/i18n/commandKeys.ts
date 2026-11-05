import { ariaShortcut, shortcutLabel } from '@europe-historical-atlas/core/i18n/shortcuts'

import type { Locale } from '@europe-historical-atlas/core/i18n/locale'
import type { Chord, Platform } from '@europe-historical-atlas/core/i18n/shortcuts'

/**
 * Every command's keys, written once (CARTO-345, the shortcut converter): what a label is written from
 * ({@link shortcutText}), and what each listener hears — saving (`persistence/saveShortcut.ts`, everywhere, a text
 * field included), undo and redo (`canvas/navigation.ts`), the stacking moves (`ui/utils/stackingShortcut.ts`), and
 * copying, pasting, *Open…* and *Save as…* (`ui/utils/commandListener.ts`, left to a text field and an open dialogue). So a
 * label and a key cannot disagree. At the package root because the canvas and the year on disk read it as much as the
 * chrome. The keys the dev validated on 2026-11-03, in `files/plans/cartographer/copy-paste-between-maps.md`; the
 * stacking keys are his of 2026-10-16 (`s16`).
 *
 * **Of the paste keys, ‹cmd+V› alone is heard** (2026-11-05, the polities' and the stretch's paste); the sheet's is
 * written for the menu's label only. The outline's, ‹alt+cmd+V›, went with « Coller le tracé », struck by the dev
 * on 2026-11-05.
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
  front: { key: 'ArrowUp', command: true, shift: true },
  forward: { key: 'ArrowUp', command: true },
  backward: { key: 'ArrowDown', command: true },
  back: { key: 'ArrowDown', command: true, shift: true },
} as const satisfies Record<string, Chord>

/** A command of {@link COMMAND_KEYS}. */
export type Command = keyof typeof COMMAND_KEYS

/** A command's shortcut as a control shows it: the label, and what a screen reader is told. */
export interface ShortcutText {
  /** As the system writes it — ⇧⌘V on a Mac, Ctrl+Maj+V elsewhere in French. */
  shown: string
  /** `aria-keyshortcuts`, both systems' forms. */
  aria: string
}

/**
 * A command's shortcut, as this system and this language write it — the one place a label is made, for the chrome
 * (`ui/hooks/useShortcut.ts`) and for a sentence said from the root alike.
 * @param command - the command
 * @param platform - the system
 * @param locale - the language
 * @returns the label and its screen reader's form
 */
export function shortcutText(command: Command, platform: Platform, locale: Locale): ShortcutText {
  return {
    shown: shortcutLabel(COMMAND_KEYS[command], platform, locale),
    aria: ariaShortcut(COMMAND_KEYS[command]),
  }
}
