import type { RailTool } from './railTools'

/**
 * The keys that reach a tool, for assistive tech (A11Y-005): its own key, and → for a group's hidden
 * tools — which only the `title` said, and keyboard focus does not show a title.
 * @param entry - the tool
 * @returns the `aria-keyshortcuts` value
 */
export function keyShortcuts(entry: RailTool): string {
  return entry.variants === undefined ? entry.key : `${entry.key} ArrowRight`
}
