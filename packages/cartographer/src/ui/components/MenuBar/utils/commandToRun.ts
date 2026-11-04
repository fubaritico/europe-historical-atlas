import type { MenuCommand, MenuDefinition } from '../menuBarProps'

/**
 * The command a choice in the open menu runs.
 *
 * **A greyed command chosen runs nothing, and says so in the console** (`rules/error-handling.md`: no refusal is
 * silent): the screen shows it greyed, and the console is where a later, subtler fault can be traced back to.
 * @param menus - the bar's menus
 * @param open - the menu open
 * @param id - the command chosen
 * @returns the command to run, or `null` when there is none, or it cannot act now
 */
export function commandToRun(
  menus: readonly MenuDefinition[],
  open: string | null,
  id: string
): MenuCommand | null {
  const entry = menus.find((menu) => menu.id === open)?.entries.find((each) => each.id === id)
  if (entry?.kind !== 'command') return null
  if (!entry.enabled) {
    console.warn(`[Cartographer] the menu command "${entry.label}" cannot act now.`)
    return null
  }
  return entry
}
