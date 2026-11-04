/**
 * The shortcut converter (CARTO-345, the dev, 2026-11-03: *"a component that takes the command and converts it"*):
 * a command's keys are **written once**, as a {@link Chord}, and everything else is read from it — what a menu shows
 * on the system it runs on, what a screen reader is told, and whether a key pressed is that command — so the three
 * can never drift apart.
 *
 * **‹command› means the system's own modifier**: ‹cmd› on a Mac, ‹ctrl› elsewhere — and both are heard everywhere,
 * as every shortcut of the Cartographer already hears them. So a system read wrongly shows the other system's label,
 * never a shortcut that does nothing.
 *
 * Shown as each system writes it: on a Mac the symbols in Apple's order, ⌃⌥⇧⌘ then the key, with nothing between
 * (⇧⌘V); elsewhere the words joined by « + », ‹ctrl› first (Ctrl+Maj+V in French, Ctrl+Shift+V in English).
 */

import type { Locale } from './locale'

/** A command's keys: the key, and the modifiers held with it. */
export interface Chord {
  /** The key, as `KeyboardEvent.key` names it — a letter (any case), `ArrowUp`, `ArrowDown`, `Enter`… */
  key: string
  /** ‹cmd› on a Mac, ‹ctrl› elsewhere. */
  command?: true
  /** ‹shift›. */
  shift?: true
  /** ‹alt› — ‹option› on a Mac. */
  alt?: true
}

/** The system the shortcuts are shown for. */
export type Platform = 'mac' | 'other'

/** What a browser says of the system it runs on, reduced to the two fields read. */
export interface PlatformHints {
  /** `navigator.userAgentData`, where the browser has it — Chrome's « macOS ». */
  userAgentData?: { platform?: string } | undefined
  /** `navigator.platform` — « MacIntel », older but everywhere. */
  platform?: string | undefined
}

/**
 * The system the shortcuts are shown for.
 *
 * **Anything not read as a Mac shows ‹Ctrl›** (the dev's call, 2026-11-03): both keys work everywhere, so a wrong
 * reading costs a label, never a working shortcut — and a browser that says nothing at all is said once in the
 * console, by the caller that reads it once.
 * @param hints - what the browser says
 * @returns `'mac'` for a Mac, `'other'` for anything else; `null` when the browser says nothing
 */
export function platformOf(hints: PlatformHints): Platform | null {
  const said = hints.userAgentData?.platform ?? hints.platform
  if (said === undefined || said === '') return null
  return /mac/i.test(said) ? 'mac' : 'other'
}

/** A key's own glyph, where it has one; a letter is upper-cased. */
const KEY_GLYPHS: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: '↩',
  Escape: '⎋',
  Backspace: '⌫',
  Delete: '⌦',
}

/** The words for the modifiers off a Mac, by language. */
const MODIFIER_WORDS: Readonly<Record<Locale, { command: string; alt: string; shift: string }>> = {
  fr: { command: 'Ctrl', alt: 'Alt', shift: 'Maj' },
  en: { command: 'Ctrl', alt: 'Alt', shift: 'Shift' },
}

/**
 * A key as a menu writes it.
 * @param key - the key
 * @returns its glyph, or the letter upper-cased
 */
function keyLabel(key: string): string {
  return KEY_GLYPHS[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

/**
 * A shortcut as the system it runs on writes it — ⇧⌘V on a Mac, Ctrl+Maj+V elsewhere in French.
 * @param chord - the command's keys
 * @param platform - the system
 * @param locale - the language, for the words off a Mac
 * @returns the label a menu shows beside the command
 */
export function shortcutLabel(chord: Chord, platform: Platform, locale: Locale): string {
  if (platform === 'mac') {
    return `${chord.alt ? '⌥' : ''}${chord.shift ? '⇧' : ''}${chord.command ? '⌘' : ''}${keyLabel(chord.key)}`
  }
  const words = MODIFIER_WORDS[locale]
  return [
    chord.command ? words.command : null,
    chord.alt ? words.alt : null,
    chord.shift ? words.shift : null,
    keyLabel(chord.key),
  ]
    .filter((part) => part !== null)
    .join('+')
}

/**
 * The shortcut as `aria-keyshortcuts` writes it, both systems' forms — a screen reader names what is pressed.
 * @param chord - the command's keys
 * @returns « Meta+Shift+V Control+Shift+V », or one form when the chord holds no ‹command›
 */
export function ariaShortcut(chord: Chord): string {
  const rest = [
    chord.alt ? 'Alt' : null,
    chord.shift ? 'Shift' : null,
    chord.key.length === 1 ? chord.key.toUpperCase() : chord.key,
  ]
    .filter((part) => part !== null)
    .join('+')
  return chord.command ? `Meta+${rest} Control+${rest}` : rest
}

/** A key pressed, reduced to what a chord is compared with. */
export interface PressedKey {
  /** `KeyboardEvent.key`. */
  key: string
  /**
   * `KeyboardEvent.code` — the key's place on the keyboard, « KeyV », as on a QWERTY keyboard whatever the layout.
   * Read for a letter only when ‹alt› is held, because on a Mac ‹option› changes the character `key` gives (⌥⌘V
   * gives « √ »); otherwise `key`, which follows the layout.
   */
  code?: string
  /** ‹cmd›. */
  metaKey: boolean
  /** ‹ctrl›. */
  ctrlKey: boolean
  /** ‹shift›. */
  shiftKey: boolean
  /** ‹alt›. */
  altKey: boolean
}

/**
 * Whether a key pressed is a command's — exactly its modifiers, no more: ‹shift+cmd+C› is not ‹cmd+C›.
 * @param event - the key pressed
 * @param chord - the command's keys
 * @returns `true` for that command
 */
export function isChord(event: PressedKey, chord: Chord): boolean {
  const command = event.metaKey || event.ctrlKey
  // The character first: it follows the keyboard's layout, so ‹cmd+Z› is the key marked Z on an AZERTY keyboard too,
  // whose `code` is « KeyW ». The place only when ‹alt› is held, which on a Mac changes the character.
  const isLetter = /^[a-z]$/i.test(chord.key)
  const sameKey =
    event.key.toLowerCase() === chord.key.toLowerCase() ||
    (chord.alt === true && isLetter && event.code === `Key${chord.key.toUpperCase()}`)
  return (
    sameKey &&
    command === (chord.command === true) &&
    event.shiftKey === (chord.shift === true) &&
    event.altKey === (chord.alt === true)
  )
}
