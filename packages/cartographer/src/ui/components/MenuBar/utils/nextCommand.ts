import type { MenuEntry } from '../menuBarProps'

/** Where the focus goes in an open menu: one line down or up, or to an end. */
export type MenuStep = 1 | -1 | 'first' | 'last'

/**
 * The place the focus goes among `count` commands, from the one at `at` (`-1` for none) — round from one end to the
 * other, as a system's menu does; with none focused, ‹↓› takes the first and ‹↑› the last.
 * @param at - the place focused now, or `-1`
 * @param step - which way
 * @param count - how many commands can act, one at least
 * @returns the place to focus
 */
function placeAfter(at: number, step: MenuStep, count: number): number {
  if (step === 'first') return 0
  if (step === 'last') return count - 1
  if (at === -1) return step === 1 ? 0 : count - 1
  return (at + step + count) % count
}

/**
 * The command the focus moves to — the next one that can act, the separators and the greyed commands skipped.
 * @param entries - the menu's lines
 * @param from - the command focused now, or `null` when none is
 * @param step - which way
 * @returns the command's id, or `null` when none of the menu can act
 */
export function nextCommand(
  entries: readonly MenuEntry[],
  from: string | null,
  step: MenuStep
): string | null {
  const active = entries.flatMap((entry) =>
    entry.kind === 'command' && entry.enabled ? [entry.id] : []
  )
  if (active.length === 0) return null
  const at = from === null ? -1 : active.indexOf(from)
  return active[placeAfter(at, step, active.length)] ?? null
}
