import type { RailTool } from './railTools'
import type { ToolIconName } from '../../ToolIcon'

/**
 * A tool's glyph — for a group head, the glyph of the variant in use, as Illustrator's button shows the
 * Pencil once it is chosen. A tool heading no group keeps its own.
 * @param entry - the tool
 * @param current - the variant in use
 * @returns the glyph's name
 */
export function headIcon(entry: RailTool, current: string): ToolIconName {
  return entry.variants?.find((variant) => variant.id === current)?.icon ?? entry.icon
}
