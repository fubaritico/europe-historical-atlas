import type { MenuMove } from './menuAlong'

/** What a key pressed on a title of the bar asks for. */
export type TitleKeyAction =
  /** Move the focus along the titles. */
  | { kind: 'along'; move: MenuMove }
  /** Open the title's menu, the focus on its first or its last command. */
  | { kind: 'open'; start: 'first' | 'last' }
  /** Close the menu open. */
  | { kind: 'close' }

/** The keys of a title, and what each asks for — the APG's menubar: arrows along, ‹↓› ‹↑› into, ‹escape› out. */
const TITLE_KEYS: Readonly<Record<string, TitleKeyAction>> = {
  ArrowLeft: { kind: 'along', move: -1 },
  ArrowRight: { kind: 'along', move: 1 },
  Home: { kind: 'along', move: 'first' },
  End: { kind: 'along', move: 'last' },
  ArrowDown: { kind: 'open', start: 'first' },
  ArrowUp: { kind: 'open', start: 'last' },
  Escape: { kind: 'close' },
}

/**
 * What a key pressed on a title asks for.
 * @param key - `KeyboardEvent.key`
 * @returns the action, or `null` for a key the title leaves alone — ‹enter› and ‹space› press it as any button
 */
export function titleKey(key: string): TitleKeyAction | null {
  return TITLE_KEYS[key] ?? null
}
