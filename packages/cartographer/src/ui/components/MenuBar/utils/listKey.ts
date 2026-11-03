import type { MenuStep } from './nextCommand'

/** What a key pressed in an open menu asks for. */
export type ListKeyAction =
  /** Move the focus among the commands. */
  | { kind: 'step'; step: MenuStep }
  /** The menu beside, by ‹←› or ‹→›. */
  | { kind: 'beside'; side: -1 | 1 }
  /** Close the menu, the focus back on its title; `onward` lets ‹Tab› go on from there. */
  | { kind: 'leave'; onward: boolean }

/** The keys of an open menu, and what each asks for — the APG's menu. */
const LIST_KEYS: Readonly<Record<string, ListKeyAction>> = {
  ArrowDown: { kind: 'step', step: 1 },
  ArrowUp: { kind: 'step', step: -1 },
  Home: { kind: 'step', step: 'first' },
  End: { kind: 'step', step: 'last' },
  ArrowLeft: { kind: 'beside', side: -1 },
  ArrowRight: { kind: 'beside', side: 1 },
  Escape: { kind: 'leave', onward: false },
  Tab: { kind: 'leave', onward: true },
}

/**
 * What a key pressed in an open menu asks for.
 * @param key - `KeyboardEvent.key`
 * @returns the action, or `null` for a key the menu leaves alone — ‹enter› and ‹space› press the command focused
 */
export function listKey(key: string): ListKeyAction | null {
  return LIST_KEYS[key] ?? null
}
