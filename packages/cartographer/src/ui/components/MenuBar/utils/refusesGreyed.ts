import type { MenuDefinition } from '../menuBarProps'

/**
 * Whether a menu about to open is greyed whole, and so stays shut (CARTO-555) — said in the console, as every gesture
 * the tool declines (`rules/error-handling.md`).
 * @param menus - the bar's menus
 * @param id - the menu about to open, or `null` for none
 * @returns `true` when it is greyed and must not open
 */
export function refusesGreyed(menus: readonly MenuDefinition[], id: string | null): boolean {
  if (id === null || menus.find((menu) => menu.id === id)?.enabled !== false) return false
  console.warn(`[Cartographer] the menu ${id} is greyed: not opened`)
  return true
}
