import type { MenuDefinition } from '../../MenuBar'

/**
 * Every command of the menus greyed (CARTO-535: nobody signed in) — the menus keep showing what exists, as a greyed
 * command always does (CARTO-345); the separators stay.
 * @param menus - the menus
 * @returns the same menus, nothing enabled
 */
export function greyed(menus: readonly MenuDefinition[]): MenuDefinition[] {
  return menus.map((menu) => ({
    ...menu,
    entries: menu.entries.map((entry) =>
      entry.kind === 'command' ? { ...entry, enabled: false } : entry
    ),
  }))
}
