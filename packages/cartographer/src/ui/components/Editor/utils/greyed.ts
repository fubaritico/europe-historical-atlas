import type { MenuDefinition } from '../../MenuBar'

/**
 * The menus greyed whole (CARTO-555, the dev: « désactiver Fichier et Édition au lieu de désactiver les menus »): each
 * title stays on the bar, greyed, and does not open — nobody signed in (CARTO-535), or Édition with no map open
 * (CARTO-536). Their commands are left as they are, never seen while the menu is shut.
 * @param menus - the menus
 * @returns the same menus, each greyed
 */
export function greyed(menus: readonly MenuDefinition[]): MenuDefinition[] {
  return menus.map((menu) => ({ ...menu, enabled: false }))
}
