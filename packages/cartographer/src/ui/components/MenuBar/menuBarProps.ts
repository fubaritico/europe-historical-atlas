import type { ShortcutText } from '../../../i18n/commandKeys'

/** A command of a menu: its name, its keys, whether it can act now, and what it does. */
export interface MenuCommand {
  /** What the entry is. */
  kind: 'command'
  /** Unique within its menu — the entry's key, and how a choice is found back. */
  id: string
  /** Its name, in the page's language — with the subject it acts on, when it has one. */
  label: string
  /** Its shortcut as this system writes it, or `null` for a command with none (*Save a copy*). */
  keys: ShortcutText | null
  /** Whether it can act now: greyed otherwise, never hidden — the menu shows what exists (CARTO-345). */
  enabled: boolean
  /** What choosing it does — called after the menu has closed. */
  onChoose: () => void
}

/** A hairline between two groups of commands. */
export interface MenuSeparator {
  /** What the entry is. */
  kind: 'separator'
  /** Unique within its menu. */
  id: string
}

/** One line of a menu. */
export type MenuEntry = MenuCommand | MenuSeparator

/** A menu of the bar: its title and its lines. */
export interface MenuDefinition {
  /** Unique within the bar. */
  id: string
  /** Its title on the bar — *Fichier*, *Édition*. */
  label: string
  /** Its lines, in order. */
  entries: readonly MenuEntry[]
}
