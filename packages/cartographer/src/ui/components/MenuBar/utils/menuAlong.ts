import type { MenuDefinition } from '../menuBarProps'

/** A move along the bar's titles: one over, or to an end. */
export type MenuMove = -1 | 1 | 'first' | 'last'

/**
 * The menu a move along the bar lands on, round the ends.
 * @param menus - the bar's menus
 * @param from - the menu it moves from, or `null`
 * @param move - one over, or an end
 * @returns the menu's id, or `null` for a bar with no menu
 */
export function menuAlong(
  menus: readonly MenuDefinition[],
  from: string | null,
  move: MenuMove
): string | null {
  if (move === 'first') return menus[0]?.id ?? null
  if (move === 'last') return menus.at(-1)?.id ?? null
  const at = menus.findIndex((menu) => menu.id === from)
  return menus[(at + move + menus.length) % menus.length]?.id ?? null
}
