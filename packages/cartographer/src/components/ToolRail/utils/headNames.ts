import { headLabel } from './headLabel'
import { keyShortcuts } from './keyShortcuts'

import type { RailTool } from './railTools'

/**
 * What a tool's button says and how it is reached: pressed or not, its name (the variant in use for a
 * group head), its key in the tooltip and for assistive tech, and the one Tab stop on the tool in hand.
 * @param entry - the tool
 * @param current - the variant in use
 * @param pressed - whether it is the tool in hand
 * @param title - its tooltip, given its name and its key — the page's language
 * @returns the button's attributes
 */
export function headNames(
  entry: RailTool,
  current: string,
  pressed: boolean,
  title: (label: string, key: string) => string
) {
  const label = headLabel(entry, current)
  return {
    'aria-pressed': pressed,
    'aria-label': label,
    title: title(label, entry.key),
    'aria-keyshortcuts': keyShortcuts(entry),
    tabIndex: pressed ? 0 : -1,
  }
}
