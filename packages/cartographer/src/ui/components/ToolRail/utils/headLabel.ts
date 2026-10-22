import type { RailTool } from './railTools'

/**
 * A tool's name — for a group head, the name of the variant in use, so the toolbar says which Pen is in
 * hand without opening the flyout (A11Y-002). The binding only ever hands a variant of the group; a tool
 * heading none keeps its own name.
 * @param entry - the tool
 * @param current - the variant in use
 * @returns the accessible name and the tooltip's first half
 */
export function headLabel(entry: RailTool, current: string): string {
  return entry.variants?.find((variant) => variant.id === current)?.label ?? entry.label
}
